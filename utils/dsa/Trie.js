class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.data = null;
        this.originalWord = null;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word, data = null) {
        if (!word) return;
        let node = this.root;
        for (let char of word.toLowerCase()) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
        node.data = data;
        node.originalWord = word;
    }

    search(word) {
        if (!word) return null;
        let node = this.root;
        for (let char of word.toLowerCase()) {
            if (!node.children[char]) return null;
            node = node.children[char];
        }
        return node.isEndOfWord ? node.data : null;
    }

    startsWith(prefix) {
        if (!prefix) return [];
        let node = this.root;
        for (let char of prefix.toLowerCase()) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }
        return this._findAllWords(node, prefix);
    }

    _findAllWords(node, prefix) {
        let results = [];
        if (node.isEndOfWord) results.push({ word: node.originalWord, data: node.data });
        
        for (let char in node.children) {
            results = results.concat(this._findAllWords(node.children[char], prefix + char));
        }
        return results;
    }
}
module.exports = Trie;
