import {
    CS_TARGET,
    GO_TO_SNIPPET,
    CS_FOUND_SNIPPETS,
    SNIPPETIFY_SAVE_USER,
    SNIPPETIFY_USER_CARD_URL
} from './contants'

/**
 * Browser action. Popup script.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class Popup {
    constructor () {
        this.hydrateUserCard()
        $(document).ready(() => {
            this.hydrateSnippetsList()
            this.addListenersToViews()
        })
    }

    hydrateSnippetsList () {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, { target: CS_TARGET, type: CS_FOUND_SNIPPETS }, res => {
                const items = res.payload
                const container = $('.snippet-box .snippet-list')
                if (items && items.length > 0) {
                    container.html('')
                    $('.snippet-box .title').after(`<small class="ml-auto text-secondary total-found">${items.length} found in this page</small>`)
                    items.forEach(v => {
                        const row = $('<div class="snippet-row"></div>')
                        const lang = $('<span class="language"></span>')
                        row.html($(`<pre class="p-0 my-1" data-uid='${v.uid}'></pre>`)
                            .html($('<code class="mt-0 pt-0 d-block"></code>').text(v.code)))
                        if (v.tags && v.tags.length > 0) {
                            lang.text(v.tags[0].name)
                            row.prepend(lang)
                        }
                        container.append(row)
                    })
                    $('.snippet-box .snippet-list pre').each((_, el) => { (new SimpleBar(el)).recalculate() })
                }
            })
        })
    }

    hydrateUserCard () {
        chrome.storage.local.get(SNIPPETIFY_SAVE_USER, data => {
            const userCard = $('#userCard')
            const spinner = $('#spinner')
            const userInfo = data[SNIPPETIFY_SAVE_USER]
            if (!userInfo) {
                userCard.hide()
            } else {
                userCard.hide().attr({ src: SNIPPETIFY_USER_CARD_URL })
                userCard.on('load', () => {
                    userCard.show()
                    spinner.hide()
                })
            }
        })
    }

    addListenersToViews () {
        $('#app').on('click', '[data-uid]', e => {
            window.close() // Close Popup
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, { target: CS_TARGET, type: GO_TO_SNIPPET, payload: { uid: $(e.currentTarget).data('uid') } })
            })
        })
    }
}

export default new Popup()
