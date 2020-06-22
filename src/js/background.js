import $ from 'jquery'
import {
    CS_TARGET,
    SNIPPETIFY_URL,
    REFRESH_IFRAME,
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
        browser.runtime.onInstalled.addListener(() => {
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
        browser.contextMenus.create({
            id: 'snippetifyContextMenu',
            title: 'Save snippet',
            contexts: ['selection']
        })

        // Add listener
        browser.contextMenus.onClicked.addListener(info => {
            browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                browser.tabs.connect(tabs[0].id).postMessage({
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
        browser.cookies.get({ url: SNIPPETIFY_URL, name: 'token' }).then(cookie => {
            const value = ((cookie || {}).value || '')
            if (value.length > 1) {
                browser.storage.local.set({ [SNIPPETIFY_API_TOKEN]: value }).then(() => {
                    this.authenticateUser(value)
                })
            } else {
                browser.storage.local.remove(SNIPPETIFY_API_TOKEN).then(() => {
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
        browser.cookies.onChanged.addListener(e => {
            if ((e.cookie || {}).domain !== SNIPPETIFY_DOMAIN) return
            if (e.removed) {
                browser.storage.local.remove(SNIPPETIFY_API_TOKEN).then(() => {
                    this.logoutUser()
                })
            } else {
                browser.storage.local.set({ [SNIPPETIFY_API_TOKEN]: e.cookie.value }).then(() => {
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
        // On url changed
        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            browser.browserAction.setBadgeText({ text: '' })
            if (tab.url.includes('snippetify.com')) {
                browser.browserAction.disable(tabId)
                return
            }
            const port = browser.tabs.connect(tabId)
            port.postMessage({ target: CS_TARGET, type: CS_SNIPPETS_COUNT })
            port.onMessage.addListener(data => {
                if (data) browser.browserAction.setBadgeText({ text: `${data.payload || ''}` })
            })
        }, { urls: ['*://*/*'] })
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
            browser.storage.local.set({ [SNIPPETIFY_SAVE_USER]: res.data })
            this.postMessageToTabs({ target: CS_TARGET, type: REFRESH_IFRAME }) // Refresh iframe
        }).fail((xhr, status) => {
            browser.storage.local.remove(SNIPPETIFY_SAVE_USER)
        })
    }

    /**
     * Logout user.
     * @returns void
    */
    logoutUser () {
        browser.storage.local.remove(SNIPPETIFY_API_TOKEN)
        browser.storage.local.remove(SNIPPETIFY_SAVE_USER)
        this.postMessageToTabs({ target: CS_TARGET, type: REFRESH_IFRAME }) // Refresh iframe
    }

    /**
     * Post message to tabs.
     * @returns void
    */
    postMessageToTabs (payload) {
        browser.tabs.query({}, tabs => {
            tabs.forEach(tab => {
                browser.tabs.connect(tab.id).postMessage(payload)
            })
        })
    }
}

// Initialisation
export default new Background()
