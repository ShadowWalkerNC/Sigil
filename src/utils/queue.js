'use strict';

class Queue {
    constructor() { this.items = []; }
    enqueue(item) { this.items.push(item); }
    dequeue() { return this.items.shift(); }
    get size() { return this.items.length; }
    isEmpty() { return this.items.length === 0; }
}

module.exports = { Queue };
