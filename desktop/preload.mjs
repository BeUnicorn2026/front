import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("voicePartitionDesktop", {
  isDesktop: true,
  setMeetingMode(active) {
    return ipcRenderer.invoke("voice-partition:set-meeting-mode", Boolean(active));
  }
});
