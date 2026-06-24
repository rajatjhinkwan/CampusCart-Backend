class QueueNode {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class Queue {
    constructor() {
        this.front = null;
        this.rear = null;
        this.size = 0;
    }

    enqueue(value) {
        const newNode = new QueueNode(value);
        if (!this.rear) {
            this.front = this.rear = newNode;
        } else {
            this.rear.next = newNode;
            this.rear = newNode;
        }
        this.size++;
    }

    dequeue() {
        if (!this.front) return null;
        const value = this.front.value;
        this.front = this.front.next;
        if (!this.front) this.rear = null;
        this.size--;
        return value;
    }

    isEmpty() {
        return this.size === 0;
    }
}
module.exports = Queue;
