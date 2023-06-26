import {
  RoonApiTransport,
  RoonApiTransportControl,
  RoonApiTransportZones,
  RoonCore,
  RoonSubscriptionResponse,
  Zone,
} from "roon-kit";
import { XencelabsQuickKeys, WheelEvent } from "@xencelabs-quick-keys/node";

export default class ControlManager {
  active_zone: Zone | undefined;
  transport: RoonApiTransport | undefined;
  zones: Map<string, Zone>;
  qk: XencelabsQuickKeys | undefined;

  constructor() {
    this.active_zone = undefined;
    this.zones = new Map<string, Zone>();
    this.qk = undefined;
  }

  setTransport = (transport: RoonApiTransport) => {
    this.transport = transport;
  };

  zoneSubscribed = (
    core: RoonCore,
    response: RoonSubscriptionResponse,
    body: RoonApiTransportZones
  ): void => {
    this.transport = core.services.RoonApiTransport;
    if (this.zones.size == 0) {
      body.zones?.forEach((z) => this.zones.set(z.zone_id, z));
    }

    body.zones_added?.forEach((z) => this.zones.set(z.zone_id, z));
    body.zones_changed?.forEach((z) => this.zones.set(z.zone_id, z));
    body.zones_removed?.forEach((z) => this.zones.delete(z.zone_id));

    if (this.active_zone === undefined) {
      body.zones?.forEach((zone) => {
        if (zone.state == "playing") {
          this.active_zone = zone;
          return;
        }
      });
      this.zoneSelectMenu();
    } else if (
      body.zones_changed?.find((z) => z.zone_id === this.active_zone?.zone_id)
    ) {
      this.active_zone =
        this.transport.zone_by_zone_id(this.active_zone.zone_id) ||
        this.active_zone;
      this.zoneControlMenu();
    } else if (
      body.zones_seek_changed?.find(
        (z) => z.zone_id === this.active_zone?.zone_id
      )
    ) {
      this.active_zone =
        this.transport.zone_by_zone_id(this.active_zone.zone_id) ||
        this.active_zone;
      this.zoneControlMenu();
    }
  };

  secondsToMinutesAndSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor(seconds / 60) % 60;
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  setActiveZone = (newZoneId: string) => {
    this.active_zone = this.zones.get(newZoneId);
  };

  control = (cmd: RoonApiTransportControl) => {
    if (this.active_zone === undefined) return;
    this.active_zone && this.transport?.control(this.active_zone, cmd);
  };

  playpause = () => {
    this.control("playpause");
  };
  previous = () => {
    this.control("previous");
  };
  next = () => {
    this.control("next");
  };

  resetQuickKeys = async () => {
    this.qk = undefined;
  };

  //TODO(wwong): Paginate zone selection
  zoneSelectMenu = async () => {
    console.log("Entering zone select menu");
    if (this.qk === undefined) {
      console.log("[E] No QuickKeys bound");
      return;
    }
    this.active_zone = undefined;
    let count = 0;
    let menu: MenuEntry[] = [];
    this.zones.forEach((zone) => {
      if (count > 8) {
        return;
      }
      menu.push({
        text: zone.display_name,
        fn: () => {
          this.active_zone = zone;
          this.zoneControlMenu();
        },
      });
      count += 1;
    });
    await this.setupMenu(menu);
  };

  refreshActiveZone = () => {
    if (this.active_zone) {
      const fresh = this.transport?.zone_by_zone_id(this.active_zone?.zone_id);
      if (fresh !== null) this.active_zone = fresh;
    }
  };

  zoneControlMenu = async () => {
    if (this.qk === undefined) return;
    switch (this.active_zone?.state) {
      case "playing":
        this.qk?.setWheelColor(0, 120, 0);
        break;
      case "paused":
        this.qk?.setWheelColor(255, 165, 0);
        break;
      case "loading":
        this.qk?.setWheelColor(0, 0, 120);
        break;
      case "stopped":
        this.qk?.setWheelColor(120, 0, 0);
        break;
    }
    let menu: MenuEntry[] = [
      { text: this.active_zone?.state || "", fn: () => {} },
      EMPTY_MENU_ENTRY,
      {
        text: this.active_zone?.now_playing?.seek_position
          ? this.secondsToMinutesAndSeconds(
              this.active_zone.now_playing.seek_position
            )
          : "",
        fn: () => {},
      },
      {
        text: this.active_zone?.now_playing?.length
          ? this.secondsToMinutesAndSeconds(this.active_zone.now_playing.length)
          : "",
        fn: () => {},
      },

      { text: "\u2590\u23F4\u23F4", fn: this.previous },
      { text: "\u23F5\u23F8", fn: this.playpause },
      { text: "\u23F5\u23F5\u258C", fn: this.next },
      { text: "zones", fn: this.zoneSelectMenu },

      { text: "zones", fn: this.zoneSelectMenu },
      { text: "zones", fn: this.zoneSelectMenu },
    ];
    this.setupMenu(menu);
  };

  volumeUp = (increment: number = 2) => {
    if (this.active_zone === undefined) return;
    this.active_zone?.outputs.forEach((output) => {
      this.transport?.change_volume(output, "relative", increment);
    });
  };

  volumeDown = (increment: number = 2) => {
    if (this.active_zone === undefined) return;
    this.active_zone?.outputs.forEach((output) => {
      this.transport?.change_volume(output, "relative", -increment);
    });
  };

  setupMenu = async (
    menuEntries: MenuEntry[],
    wheelUpHandler: Function = this.volumeUp,
    wheelDownHandler: Function = this.volumeDown
  ) => {
    this.qk?.removeAllListeners();
    let handlers: Function[] = [];
    for (let i = 0; i < 10; i++) {
      var menuEntry: MenuEntry;
      if (menuEntries.length <= i || menuEntries[i] === undefined) {
        menuEntry = EMPTY_MENU_ENTRY;
      } else {
        menuEntry = menuEntries[i];
        //console.log(`setting up button ${i}: `, menuEntry);
      }
      if (i < 8) {
        await this.qk?.setKeyText(i, menuEntry.text.substring(0, 8));
      }
      handlers.push(menuEntry?.fn);
    }
    this.qk?.on("down", (keyNum) => handlers[keyNum]());
    this.qk?.on("wheel", (wheelEvent) => {
      if (this.active_zone === undefined) return;
      switch (wheelEvent) {
        case WheelEvent.Left:
          wheelDownHandler();
          break;
        case WheelEvent.Right:
          wheelUpHandler();
          break;
      }
    });
  };

  setupQuickKeys = async (device: XencelabsQuickKeys) => {
    this.qk = device;
    await device.startData();
    if (this.active_zone) {
      device.showOverlayText(2, "Resuming Roon Control");
      this.zoneControlMenu();
    } else {
      device.showOverlayText(2, "Connected to Roon Control");
      this.zoneSelectMenu();
    }
  };
}

let EMPTY_MENU_ENTRY: MenuEntry = {
  text: "",
  fn: () => {},
};

interface MenuEntry {
  text: string;
  fn: () => void;
}
