import {
    CS_TARGET,
    GO_TO_SNIPPET,
    REFRESH_IFRAME,
    CS_SNIPPETS_COUNT,
    CS_FOUND_SNIPPETS,
    REVIEW_SELECTED_SNIPPET,
    SNIPPETIFY_NEW_SNIPPET_URL
} from './contants'

/**
 * Content scripts
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class ContentScripts {
    constructor () {
        this.insertIframeToDom()
        this.navigationEventListener()
        this.goToSnippetEventListener()
        this.insertSnippetActionToDom()
        this.snippetReviewEventListener()
        this.refreshIframeEventListener()
    }

    /**
     * Fire new event on navigator tab changed.
     * Send list and number of snippets.
     * @returns void
     */
    navigationEventListener () {
        browser.runtime.onConnect.addListener(port => {
            port.onMessage.addListener(data => {
                if (data.target === CS_TARGET && data.type === CS_SNIPPETS_COUNT) { // Snippet count
                    port.postMessage({ payload: $('pre > code, div.highlight > pre').length })
                } else if (data.target === CS_TARGET && data.type === CS_FOUND_SNIPPETS) { // Snippet list
                    const items = []
                    $('pre > code, div.highlight > pre').each((_, el) => {
                        items.push(this.fetchSnippetFromDom($(el).parent().first()))
                    })
                    port.postMessage({ payload: items })
                }
            })
        })
    }

    /**
     * Listen selected snippet event from browser popup.
     * @returns void
     */
    snippetReviewEventListener () {
        browser.runtime.onConnect.addListener(port => {
            port.onMessage.addListener(data => {
                if (data.target === CS_TARGET && data.type === REVIEW_SELECTED_SNIPPET) this.openIframe(data.payload)
            })
        })
    }

    /**
     * Go to specific snippet.
     * @returns void
     */
    goToSnippetEventListener () {
        browser.runtime.onConnect.addListener(port => {
            port.onMessage.addListener(data => {
                if (data.target === CS_TARGET && data.type === GO_TO_SNIPPET) {
                    $('html, body').animate({
                        scrollTop: (parseInt($(`[data-uid="${data.payload.uid}"]`).offset().top) - 100)
                    }, 1000)
                }
            })
        })
    }

    /**
     * Get snippet from page and create a snippet object.
     * @returns array
     */
    fetchSnippetFromDom (parent) {
        return {
            type: 'wiki',
            uid: parent.data('uid'),
            title: $('head > title').text(),
            code: parent.find('code, pre').text(),
            description: `${parent.prev('p').text()} ${parent.next('p').text()}`,
            tags: this.fetchTagsFromDom(parent),
            meta: {
                target: {
                    type: 'firefox-ext',
                    name: browser.runtime.getManifest().name,
                    version: browser.runtime.getManifest().version
                },
                website: {
                    url: window.location.href,
                    name: window.location.hostname,
                    brand: $('[property="og:image"]').attr('content')
                }
            }
        }
    }

    fetchTagsFromDom (parent) {
        // With class language-{tag} or lang-{tag}
        const tags = []

        // Language or lang
        if (parent.attr('class').includes('lang') && parent.attr('class').includes('language')) {
            parent.attr('class')
                .split(' ')
                .filter(v => v.includes('language') || v.includes('lang'))
                .flatMap(v => v.split('-'))
                .filter(v => v.trim().length > 0 && !['language', 'lang'].includes(v.trim()))
                .forEach(v => tags.push(v))
        }

        // With data-lang in code tag
        if (parent.find('[data-lang]').length > 0) tags.push(parent.find('[data-lang]').data('lang'))

        // highlight
        if (parent.attr('class').includes('highlight')) {
            parent.attr('class')
                .split(' ')
                .filter(v => v.includes('highlight-source'))
                .flatMap(v => v.split('-'))
                .filter(v => v.trim().length > 0 && !['source', 'highlight'].includes(v.trim()))
                .forEach(v => tags.push(v))
        }

        // hljs
        if (parent.attr('class').includes('hljs')) {
            parent.attr('class')
                .split(' ')
                .filter(v => v.includes('highlight'))
                .flatMap(v => v.split('-'))
                .filter(v => v.trim().length > 0 && !['highlight'].includes(v.trim()))
                .forEach(v => tags.push(v))
        }

        // hljs in code tag
        if (parent.find('.hljs').length) {
            parent.find('.hljs')
                .attr('class')
                .split(' ')
                .filter(v => !v.includes('hljs'))
                .filter(v => v.trim().length > 0)
                .forEach(v => tags.push(v))
        }

        // Return tags
        return tags.flatMap(v => ({ name: v }))
    }

    /**
     * Insert snippetify btn to the DOM.
     * @returns void
     */
    insertSnippetActionToDom () {
        // Return if snippetify snippet
        if ($('pre').data('provider') === 'snippetify') return

        // Insert an action button to dom
        $('pre > code, div.highlight > pre').each((i, el) => {
            $(el).parent().addClass('snippetify-snippet-wrapper').attr({ 'data-uid': i })
            $(el).after($('<a href="#" class="snippet-action" id="snippetifyAction"></a>'))
        })

        // Add listener
        $('pre, div.highlight').on('click', '#snippetifyAction', e => {
            this.openIframe(this.fetchSnippetFromDom($(e.currentTarget).parent().first())) // Open iframe
            return false // Prevent default
        })
    }

    /**
     * Append iframe to dom.
     * Frame contains a modal for snippet saving.
     * @returns void
     */
    insertIframeToDom () {
        // Append frame to dom when there are code tags
        if ($('pre > code, div.highlight > pre').length > 0) {
            // Insert iframe
            $('body').append($('<iframe>')
                .addClass('snippetify-iframe hide').attr({
                    scrolling: 'no',
                    frameBorder: 0,
                    id: 'snippetifyIframe',
                    name: 'snippetifyIframe',
                    src: SNIPPETIFY_NEW_SNIPPET_URL
                }))

            // Get listen close event from iframe
            window.addEventListener('message', e => {
                if (e.data && e.data.type === 'NEW_SNIPPET' && e.data.action === 'close') this.closeIframe()
            })
        }
    }

    /**
     * Refresh iframe
     * When user login or logout
     * @returns void
     */
    refreshIframeEventListener () {
        browser.runtime.onConnect.addListener(port => {
            port.onMessage.addListener(data => {
                if (data.target === CS_TARGET && data.type === REFRESH_IFRAME) {
                    $('#snippetifyIframe').attr({ src: ' ' })
                    $('#snippetifyIframe').attr({ src: SNIPPETIFY_NEW_SNIPPET_URL })
                }
            })
        })
    }

    /**
     * Fire event to open iframe and inner modal.
     * @returns void
     */
    openIframe (payload) {
        $('#snippetifyIframe')
            .stop()
            .css('opacity', 0)
            .removeClass('hide')
            .animate({ opacity: 1 }, 90, 'linear', () => {
                $('#snippetifyIframe')[0].contentWindow.postMessage({ type: 'NEW_SNIPPET', payload: payload }, '*')
            })
    }

    /**
     * Close the iframe.
     * @returns void
     */
    closeIframe () {
        $('#snippetifyIframe').stop().animate({ opacity: 0 }, 100, () => {
            $('#snippetifyIframe').addClass('hide')
        })
    }
}

export default new ContentScripts()
