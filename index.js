const fs = require('fs');
const WebSocket = require('ws');
const axios = require('axios');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

function displayHeader() {
  const width = process.stdout.columns;
  const headerLines = [
    "<|============================================|>",
    " OpenLedger Bot ",
    " github.com/recitativonika ",
    "<|============================================|>"
  ];
  headerLines.forEach(line => {
    console.log(`\x1b[36m${line.padStart((width + line.length) / 2)}\x1b[0m`);
  });
}

const tokens = fs.readFileSync('account.txt', 'utf8').trim().split('\n').map(line => {
  const [token, workerID, id, ownerAddress] = line.split(':');
  return { token, workerID, id, ownerAddress };
});

let proxies = [];
try {
  proxies = fs.readFileSync('proxy.txt', 'utf8').trim().split(/\s+/);
} catch (error) {
  console.error('Error reading proxy.txt:', error.message);
}

if (proxies.length < tokens.length) {
  console.error('The number of proxies is less than the number of accounts. Please provide enough proxies.');
  process.exit(1);
}

const accountIDs = {};

const gpuList = JSON.parse(fs.readFileSync('src/gpu.json', 'utf8'));

let dataAssignments = {};
try {
  dataAssignments = JSON.parse(fs.readFileSync('data.json', 'utf8'));
} catch (error) {
  console.log('No existing data assignments found, initializing new assignments.');
}

function getOrAssignResources(workerID) {
  if (!dataAssignments[workerID]) {
    const randomGPU = gpuList[Math.floor(Math.random() * gpuList.length)];
    const randomStorage = (Math.random() * 500).toFixed(2);
    dataAssignments[workerID] = {
      gpu: randomGPU,
      storage: randomStorage
    };
    fs.writeFileSync('data.json', JSON.stringify(dataAssignments, null, 2));
  }
  return dataAssignments[workerID];
}

async function askUseProxy() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    function ask() {
      rl.question('Do you want to use a proxy? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          resolve(true);
          rl.close();
        } else if (answer.toLowerCase() === 'n') {
          resolve(false);
          rl.close();
        } else {
          console.log('Please answer with y or n.');
          ask();
        }
      });
    }
    ask();
  });
}

async function getAccountID(token, index, useProxy) {
  try {
    const proxyUrl = proxies[index];
    const agent = useProxy ? new HttpsProxyAgent(proxyUrl) : undefined;
    const proxyText = useProxy ? proxyUrl : 'False';

    const response = await axios.get('https://apitn.openledger.xyz/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      httpsAgent: agent
    });
    const accountID = response.data.data.id;
    accountIDs[token] = accountID;
    console.log(`\x1b[33m[${index + 1}]\x1b[0m AccountID \x1b[36m${accountID}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);
  } catch (error) {
    console.error(`Error getting accountID for token index ${index}:`, error.message);
  }
}

async function getAccountDetails(token, index, useProxy) {
  try {
    const proxyUrl = proxies[index];
    const agent = useProxy ? new HttpsProxyAgent(proxyUrl) : undefined;
    const proxyText = useProxy ? proxyUrl : 'False';

    const rewardRealtimeResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward_realtime', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      httpsAgent: agent
    });
    const rewardHistoryResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward_history', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      httpsAgent: agent
    });

    const totalHeartbeats = parseInt(rewardRealtimeResponse.data.data[0].total_heartbeats, 10);
    const totalPoints = parseInt(rewardHistoryResponse.data.data[0].total_points, 10);
    const total = totalHeartbeats + totalPoints;

    console.log(`\x1b[33m[${index + 1}]\x1b[0m AccountID \x1b[36m${accountIDs[token]}\x1b[0m, Total Heartbeat \x1b[32m${totalHeartbeats}\x1b[0m, Total Points \x1b[32m${total}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);
  } catch (error) {
    console.error(`Error getting account details for token index ${index}:`, error.message);
  }
}

async function processRequests(useProxy) {
  const promises = tokens.map(({ token, workerID, id, ownerAddress }, index) => {
    return (async () => {
      await getAccountID(token, index, useProxy);
      if (accountIDs[token]) {
        await getAccountDetails(token, index, useProxy);
        connectWebSocket({ token, workerID, id, ownerAddress }, index, useProxy);
      }
    })();
  });

  await Promise.all(promises);
}

function connectWebSocket({ token, workerID, id, ownerAddress }, index, useProxy) {
  const wsUrl = `wss://apitn.openledger.xyz/ws/v1/orch?authToken=${token}`;
  let ws = new WebSocket(wsUrl);
  const proxyText = useProxy ? proxies[index] : 'False';

  function sendHeartbeat() {
    const { gpu: assignedGPU, storage: assignedStorage } = getOrAssignResources(workerID);
    const heartbeatMessage = {
      message: {
        Worker: {
          Identity: workerID,
          ownerAddress,
          type: 'LWEXT',
          Host: 'chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc'
        },
        Capacity: {
          AvailableMemory: (Math.random() * 32).toFixed(2),
          AvailableStorage: assignedStorage,
          AvailableGPU: assignedGPU,
          AvailableModels: []
        }
      },
      msgType: 'HEARTBEAT',
      workerType: 'LWEXT',
      workerID
    };
    console.log(`\x1b[33m[${index + 1}]\x1b[0m Sending heartbeat for workerID: \x1b[33m${workerID}\x1b[0m, AccountID \x1b[33m${accountIDs[token]}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);
    ws.send(JSON.stringify(heartbeatMessage));
  }

  ws.on('open', function open() {
    console.log(`\x1b[33m[${index + 1}]\x1b[0m Connected to WebSocket for workerID: \x1b[33m${workerID}\x1b[0m, AccountID \x1b[33m${accountIDs[token]}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);

    const registerMessage = {
      workerID,
      msgType: 'REGISTER',
      workerType: 'LWEXT',
      message: {
        id,
        type: 'REGISTER',
        worker: {
          host: 'chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc',
          identity: workerID,
          ownerAddress,
          type: 'LWEXT'
        }
      }
    };
    ws.send(JSON.stringify(registerMessage));

    setInterval(sendHeartbeat, 30000);
  });

  ws.on('message', function incoming(data) {
    console.log(`\x1b[33m[${index + 1}]\x1b[0m Received for workerID \x1b[33m${workerID}\x1b[0m: ${data}, AccountID \x1b[33m${accountIDs[token]}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);
  });

  ws.on('error', function error(err) {
    console.error(`\x1b[33m[${index + 1}]\x1b[0m WebSocket error for workerID \x1b[33m${workerID}\x1b[0m:`, err);
  });

  ws.on('close', function close() {
    console.log(`\x1b[33m[${index + 1}]\x1b[0m WebSocket connection closed for workerID \x1b[33m${workerID}\x1b[0m, AccountID \x1b[33m${accountIDs[token]}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);
    setTimeout(() => {
      console.log(`\x1b[33m[${index + 1}]\x1b[0m Reconnecting WebSocket for workerID: \x1b[33m${workerID}\x1b[0m, AccountID \x1b[33m${accountIDs[token]}\x1b[0m, Proxy: \x1b[36m${proxyText}\x1b[0m`);
      connectWebSocket({ token, workerID, id, ownerAddress }, index, useProxy);
    }, 5000);
  });
}

(async () => {
  displayHeader();
  const useProxy = await askUseProxy();
  processRequests(useProxy);
  setInterval(() => processRequests(useProxy), 5 * 60 * 1000);
})();
