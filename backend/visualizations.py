"""
Visualization selector.
Returns ("iframe", url, label) or ("p5js", code, label).
"""

from agents import visualization_generator

# keyword → (url_template, label)
# Keywords are lowercased and checked via substring match
# Clear external embeds as VisuAlgo, Python Tutor, CircuitVerse, etc. enforce X-Frame-Options: SAMEORIGIN.
# This forces the generator to build custom, neobrutalist interactive p5.js/mermaid visuals instead.
EMBED_MAP = []

CONCEPT_DESCRIPTIONS = {
    "recursion": "Show a call stack building and unwinding. Draw rectangular frames labelled with function name and parameter value. Animate pushing new frame when recursed, popping when returning. Show return value. Use factorial(4) as the example.",
    "sorting": "Show an array of 8 coloured bars. Animate comparisons (highlight in amber) and swaps (highlight in blue). Show pass counter and comparison counter.",
    "linked list": "Show nodes as boxes connected by arrows. Animate traversal by highlighting current node. Show head pointer. Include insert and delete operations.",
    "binary tree": "Show a binary tree with nodes as circles. Animate in-order, pre-order, and post-order traversals. Highlight current node being visited.",
    "stack": "Show a vertical stack of blocks. Animate push (add block on top) and pop (remove from top). Show a LIFO label.",
    "queue": "Show a horizontal queue of blocks. Animate enqueue (add to back) and dequeue (remove from front). Show a FIFO label.",
    "hash table": "Show an array with index buckets. Animate hash function computation. Show collision resolution with chaining.",
    "graph": "Render an interactive graph of nodes. Let the user drag nodes to move them, double click or click an 'Add Node' button to add a node, and click two nodes in sequence to connect them with a new edge. Provide a button to toggle between directed and undirected. Allow editing edge weights/directions. Provide BFS/DFS traversal steps.",
    "prim": "Render an interactive graph of 5 nodes. Let the user drag nodes to adjust the layout, click two nodes to toggle/add an edge, and click an edge to increment its weight (rounding weights to 1 decimal place). Highlight the MST construction step-by-step (green for MST nodes, yellow for candidate edges, red for selected MST edges) via a 'Next Step' button.",
    "kruskal": "Render an interactive graph of 5 nodes with edge weights. Let the user drag nodes, toggle edges, and adjust weights. Show a sorted list of edges by weight, and highlight the edges selected by Kruskal's algorithm step-by-step while showing DSU (Disjoint Set Union) status.",
    "dijkstra": "Render an interactive directed graph of 5 nodes with edge weights. Let the user drag nodes, add edges, and edit weights. Let the user select a start node, and highlight the shortest path tree and distance table step-by-step with a 'Next Step' button.",
    "shortest path": "Render an interactive graph with edge weights. Let the user drag nodes, toggle edges, and edit weights. Highlight shortest paths and step-by-step node distances.",
    "minimum spanning": "Render an interactive graph. Let the user drag nodes, edit weights, and toggle edges. Highlight MST edges step-by-step using Prim's or Kruskal's algorithm.",
    "routing": "Render a network of routers as nodes. Let the user drag nodes, edit link costs, and select source and destination. Show routing path step-by-step.",
    "ospf": "Render a network of routers. Let the user drag nodes and edit link costs. Highlight the Dijkstra shortest-path computation for routing tables.",
    "pid": "Show a feedback control loop diagram. Animate error signal, P/I/D components combining. Show system response curve.",
    "flip flop": "Show D flip-flop truth table and timing diagram. Animate clock edge triggering state change.",
    "cmos": "Show PMOS and NMOS transistors in a CMOS inverter. Animate current flow based on input voltage.",
    "tcp": "Show sender and receiver windows as sliding boxes over numbered packets. Animate sends, acks, and window sliding.",
    "os scheduling": "Draw a Gantt chart animating process scheduling. Show process queue on left, CPU bar on right.",
    "page replacement": "Show page frames (3 frames) and a reference string. Animate each reference: hit in green, miss in red. Show fault counter.",
    "packet": "Show Layer-3 packet encapsulation: Animate a Packet (containing IP Header and Payload Data) descending. Then, show it being nested/encapsulated inside a larger Layer-2 Frame (adding MAC Header at the front and Frame Trailer/CRC at the back). Label MAC addresses and IP addresses clearly. Make the nesting relationship visually clear and show how they travel together.",
    "frame": "Show Layer-3 packet encapsulation: Animate a Packet (containing IP Header and Payload Data) descending. Then, show it being nested/encapsulated inside a larger Layer-2 Frame (adding MAC Header at the front and Frame Trailer/CRC at the back). Label MAC addresses and IP addresses clearly. Make the nesting relationship visually clear and show how they travel together.",
}


def get_visualization(topic: str, subject: str, context: str = "") -> dict:
    """
    Returns visualization config for a topic.
    Returns: {type: "iframe"|"p5js", url: str, code: str, label: str}
    """
    topic_lower = topic.lower()

    # Check embed map
    for keyword, url, label in EMBED_MAP:
        if keyword in topic_lower:
            return {
                "type": "iframe",
                "url": url,
                "code": "",
                "label": f"Powered by {label}",
            }

    # Check database cache for dynamically generated visualizations
    import database
    cached_viz = database.get_cached_visualization(subject, topic)
    if cached_viz:
        return cached_viz

    # Fall back to generator (Mermaid or p5.js)
    concept_desc = _get_concept_description(topic_lower)
    try:
        vis = visualization_generator(topic, concept_desc, context)
        viz_data = {
            "type": vis["type"],
            "url": "",
            "code": vis["code"],
            "label": f"Generated {vis['type']} visual",
        }
        database.set_cached_visualization(subject, topic, viz_data)
        return viz_data
    except Exception as e:
        logger.error(f"Visualization generator error: {e}")
        return {
            "type": "p5js",
            "url": "",
            "code": _simple_p5js(topic),
            "label": "Generated visual",
        }


def _get_concept_description(topic_lower: str) -> str:
    for key, desc in CONCEPT_DESCRIPTIONS.items():
        if key in topic_lower:
            return desc
    return f"Create an interactive educational visualization for the concept: {topic_lower}. Show the key mechanism, data flow, or structural relationships visually."


def _escape_js_string(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')


def _simple_p5js(topic: str) -> str:
    topic_escaped = _escape_js_string(topic)
    return f"""
let t = 0;
function setup() {{
  createCanvas(600, 400);
  textAlign(CENTER, CENTER);
}}
function draw() {{
  background(255);
  t += 0.02;
  // Title
  fill('#1E293B');
  textStyle(BOLD);
  textSize(16);
  text('{topic_escaped}', width/2, 30);
  textStyle(NORMAL);
  // Animated circle
  fill('#2563EB');
  noStroke();
  let x = width/2 + cos(t) * 80;
  let y = height/2 + sin(t) * 40;
  ellipse(x, y, 40, 40);
  fill('#10B981');
  ellipse(width/2, height/2, 20, 20);
  fill('#94A3B8');
  textSize(13);
  text('Visual loading — add a textbook PDF for better results', width/2, height - 30);
}}
"""

