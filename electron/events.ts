import { IpcMainEvent } from "electron";

type IpcMainEvents = {
  eventName: string;
  handler: (event: IpcMainEvent, ...args: any[]) => void;
};

const ipcMainEvents: IpcMainEvents[] = [
  {
    eventName: "check-path",
    handler: (event, args) => {
      event.sender.send("check-path");
    }
  }
];

export { ipcMainEvents };
