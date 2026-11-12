// Service worker: adds the "Translate to Darija" context-menu item and opens the side panel.

const MENU_ID = "translate-to-darija";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Translate to Darija",
    contexts: ["selection"],
  });

  // Clicking the toolbar icon also opens the side panel.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) {
    return;
  }

  // Hand the selection to the side panel. requestedAt makes the stored value change even when the
  // same text is selected twice, so an already-open panel still gets a storage.onChanged event.
  chrome.storage.session.set({
    pendingSelection: { text: info.selectionText, requestedAt: Date.now() },
  });

  // Must run synchronously inside this handler: Chrome only opens a side panel in response to a
  // user gesture, and awaiting anything first (even the storage write above) would lose it.
  chrome.sidePanel.open({ windowId: tab.windowId });
});
