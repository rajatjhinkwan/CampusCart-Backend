const DLLNode = require('./DLLNode');

class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
        this.head = new DLLNode(null, null); // Dummy head
        this.tail = new DLLNode(null, null); // Dummy tail
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    get(key) {
        if (!this.map.has(key)) return null;
        const node = this.map.get(key);
        this.remove(node);
        this.add(node);
        return node.value;
    }

    put(key, value) {
        if (this.map.has(key)) {
            this.remove(this.map.get(key));
        }
        const newNode = new DLLNode(key, value);
        this.add(newNode);
        this.map.set(key, newNode);

        if (this.map.size > this.capacity) {
            const lru = this.head.next;
            this.remove(lru);
            this.map.delete(lru.key);
        }
    }

    add(node) {
        const prev = this.tail.prev;
        prev.next = node;
        node.prev = prev;
        node.next = this.tail;
        this.tail.prev = node;
    }

    remove(node) {
        const prev = node.prev;
        const next = node.next;
        prev.next = next;
        next.prev = prev;
    }
}
module.exports = LRUCache;
