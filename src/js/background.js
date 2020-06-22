import $ from 'jquery'
import {
    CS_TARGET,
    SNIPPETIFY_URL,
    CS_SNIPPETS_COUNT,
    SNIPPETIFY_DOMAIN,
    SNIPPETIFY_API_URL,
    SNIPPETIFY_API_TOKEN,
    SNIPPETIFY_SAVE_USER,
    REVIEW_SELECTED_SNIPPET
} from './contants'

/**
 * Background. App event listeners.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class Background {
    constructor () {
        this.onInstalled()
        this.cookieEventListener()
        this.navigationEventListener()
    }

    /**
     * Execute action when extension installed.
     * @returns void
    */
    onInstalled () {
        chrome.runtime.onInstalled.addListener(() => {
            this.createContextMenu()
            this.saveCookieToStorage()
        })
    }

    /**
     * Create context menu on installed.
     * @returns void
    */
    createContextMenu () {
        // Create menu
        chrome.contextMenus.create({
            id: 'snippetifyContextMenu',
            title: 'Save snippet',
            contexts: ['selection']
        })

        // Add listener
        chrome.contextMenus.onClicked.addListener(function (info) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    target: CS_TARGET,
                    type: REVIEW_SELECTED_SNIPPET,
                    payload: { title: '', code: info.selectionText, description: '', tags: [], type: 'wiki' }
                })
            })
        })
    }

    /**
     * Save snippetify user token on installed.
     * @returns void
    */
    saveCookieToStorage () {
        chrome.cookies.get({ url: SNIPPETIFY_URL, name: 'token' }, cookie => {
            const value = ((cookie || {}).value || '')
            if (value.length > 1) {
                chrome.storage.local.set({ [SNIPPETIFY_API_TOKEN]: value }, () => {
                    this.authenticateUser(value)
                })
            } else {
                chrome.storage.local.remove(SNIPPETIFY_API_TOKEN, () => {
                    this.logoutUser()
                })
            }
        })
    }

    /**
     * Listen for cookies changed.
     * Save snippetify user token on installed.
     * @returns void
    */
    cookieEventListener () {
        chrome.cookies.onChanged.addListener(e => {
            if ((e.cookie || {}).domain !== SNIPPETIFY_DOMAIN) return
            if (e.removed) {
                chrome.storage.local.remove(SNIPPETIFY_API_TOKEN, () => {
                    this.logoutUser()
                })
            } else {
                chrome.storage.local.set({ [SNIPPETIFY_API_TOKEN]: e.cookie.value }, () => {
                    this.authenticateUser(e.cookie.value)
                })
            }
        })
    }

    /**
     * Listen for page loaded event.
     * Listen for tab changed event.
     * @returns void
    */
    navigationEventListener () {
        // Listen for tab changed
        chrome.tabs.onActivated.addListener(info => {
            chrome.tabs.sendMessage(info.tabId, { target: CS_TARGET, type: CS_SNIPPETS_COUNT }, e => {
                if (e) chrome.browserAction.setBadgeText({ text: `${e.payload || ''}` })
            })
        })

        // Listen for page loaded
        chrome.webNavigation.onCompleted.addListener(info => {
            chrome.tabs.sendMessage(info.tabId, { target: CS_TARGET, type: CS_SNIPPETS_COUNT }, e => {
                if (e) chrome.browserAction.setBadgeText({ text: `${e.payload || ''}` })
            })
        })

        // On url changed
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            chrome.tabs.sendMessage(tabId, { target: CS_TARGET, type: CS_SNIPPETS_COUNT }, e => {
                if (e) chrome.browserAction.setBadgeText({ text: `${e.payload || ''}` })
            })
        })
    }

    /**
     * Authenticate user.
     * @returns void
    */
    authenticateUser (token) {
        $.ajax({
            method: 'GET',
            url: `${SNIPPETIFY_API_URL}/users/me`,
            contentType: 'application/json',
            crossDomain: true,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        }).done(res => {
            chrome.storage.local.set({ [SNIPPETIFY_SAVE_USER]: res.data })
        }).fail((xhr, status) => {
            chrome.storage.local.remove(SNIPPETIFY_SAVE_USER)
        })
    }

    /**
     * Logout user.
     * @returns void
    */
    logoutUser () {
        chrome.storage.local.remove(SNIPPETIFY_API_TOKEN)
        chrome.storage.local.remove(SNIPPETIFY_SAVE_USER)
    }
}

// Initialisation
export default new Background()
