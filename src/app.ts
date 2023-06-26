import { RoonExtension} from "roon-kit";
import { XencelabsQuickKeysManagerInstance } from '@xencelabs-quick-keys/node'
import ControlManager from './ControlManager.js'


const ctrl = new ControlManager();

const roon = new RoonExtension({
  description: {
    extension_id: "roon-quick-keys",
    display_name: "Roon Quick Keys Control",
    display_version: "0.1.0",
    publisher: "wwong",
    email: "git@wwong.io",
    website: "https://github.com/wwong/roon-quick-keys",
  },
  RoonApiBrowse: "not_required",
  RoonApiImage: "not_required",
  RoonApiTransport: "required",
  subscribe_outputs: false,
  subscribe_zones: true,
  log_level: "none",
});


console.log('Setting up Roon event handlers')
roon.on('subscribe_zones', ctrl.zoneSubscribed);


console.log('Starting Roon extension')
roon.start_discovery();
roon.set_status("extension starting");

console.log('Binding Roon Transport API to controller')
roon.get_core().then(core => {
  ctrl.setTransport(core.services.RoonApiTransport)
});


console.log('Setting up Quick Keys event handlers')
XencelabsQuickKeysManagerInstance.on('connect', ctrl.setupQuickKeys);
XencelabsQuickKeysManagerInstance.on('disconnect', ctrl.resetQuickKeys)

console.log('Scanning for Quick Keys')
XencelabsQuickKeysManagerInstance.scanDevices().catch((e) => {
	console.error(`scan failed: ${e}`)
});