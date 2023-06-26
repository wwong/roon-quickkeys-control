# Roon Quick Keys Control

Control Roon playback using a [Xencelabs Quick Keys](https://www.xencelabs.com/us/store/accessories/xencelabs-quick-keys-remote).

## How to Run

1. Set up a Linux computer or VM on the same network as your Roon Core.
2. Plug in your Xencelabs dongle and follow the Linux setup steps from [Julusian/node-xencelabs-quick-keys](https://github.com/Julusian/node-xencelabs-quick-keys#linux).
3. Reboot.
4. Clone this repo, install the dependencies, run the Roon extension
    ```bash
    git clone https://github.com/wwong/roon-quickkeys-control.git
    cd roon-quickkeys-control
    npm install
    npm run start
    ```
5. Authorize the "Roon Quick Keys Control" extension from Roon -> Settings -> Extensions
