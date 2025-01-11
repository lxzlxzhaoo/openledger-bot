# Openledger Bot
Openledger Bot is a simple tool designed to automate the node and daily reward claim interaction.

## Features
- **Automated node interaction**
- **Auto claim daily rewards**
- **Proxy support**

## Prerequisites
- [Node.js](https://nodejs.org/) (version 14 or higher)

## Installation

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/recitativonika/openledger-bot.git
   ```
2. Navigate to the project directory:
   ```bash
   cd openledger-bot
   ```
4. Install the necessary dependencies:
   ```bash
   npm install
   ```

## Usage

1. Set the `account.txt` and `proxy.txt (if you want to use proxy)` before running the script. Below how to setup this fie.
2. Configuration:
   Modify the `account.txt` file with your account wallet info
```
wallet1
wallet2
```
Copy wallet on [OpenLedger dashboard](https://testnet.openledger.xyz/?referral_code=ffqrnwqlzq)![Screenshot 202waeawea](https://github.com/user-attachments/assets/72e0f30b-a140-4a18-99a8-951a1fd1ccc4)


3. Modify and set the `proxy.txt` file if you want to use proxy
```
ip:port
username:password@ip:port
http://ip:port
http://username:password@ip:port
```
4. Run the script:
```bash
node index.js
```
Do not delete `data.json`, it store your websocket and account data. 

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Note
This script only for testing purpose, using this script might violates ToS and may get your account permanently banned.

Extension link : [Extension](https://chromewebstore.google.com/detail/openledger-node/ekbbplmjjgoobhdlffmgeokalelnmjjc)
Dashboard Link : [Dashboard](https://testnet.openledger.xyz/?referral_code=ffqrnwqlzq)

My reff code if you want to use :) : https://testnet.openledger.xyz/?referral_code=ffqrnwqlzq
