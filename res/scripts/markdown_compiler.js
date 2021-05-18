// Importing external modules
const marked = require("marked")
const hljs = require('highlight.js')

marked.setOptions({
    renderer: new marked.Renderer(),
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false,
    highlight: function(code) {
        return hljs.highlightAuto(code).value;
    }
})

exports.compile = (str) => {
    /*
        Return the configured marked
    */
    return marked(str)
}