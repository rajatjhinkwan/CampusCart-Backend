class Graph {
    constructor() {
        this.adjacencyList = {};
    }

    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) this.adjacencyList[vertex] = [];
    }

    addEdge(v1, v2) {
        if (!this.adjacencyList[v1]) this.addVertex(v1);
        if (!this.adjacencyList[v2]) this.addVertex(v2);
        
        // Check if edge already exists to avoid duplicates
        if (!this.adjacencyList[v1].includes(v2)) {
            this.adjacencyList[v1].push(v2);
        }
        if (!this.adjacencyList[v2].includes(v1)) {
            this.adjacencyList[v2].push(v1);
        }
    }

    removeEdge(v1, v2) {
        if (this.adjacencyList[v1]) {
            this.adjacencyList[v1] = this.adjacencyList[v1].filter(v => v !== v2);
        }
        if (this.adjacencyList[v2]) {
            this.adjacencyList[v2] = this.adjacencyList[v2].filter(v => v !== v1);
        }
    }

    bfs(start) {
        const queue = [start];
        const result = [];
        const visited = {};
        visited[start] = true;
        let currentVertex;

        while (queue.length) {
            currentVertex = queue.shift();
            result.push(currentVertex);

            if (this.adjacencyList[currentVertex]) {
                this.adjacencyList[currentVertex].forEach(neighbor => {
                    if (!visited[neighbor]) {
                        visited[neighbor] = true;
                        queue.push(neighbor);
                    }
                });
            }
        }
        return result;
    }
}
module.exports = Graph;
