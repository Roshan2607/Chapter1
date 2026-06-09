import logging
from agents import visualization_generator

logger = logging.getLogger(__name__)

# keyword → (url_template, label)
# Keywords are lowercased and checked via substring match
# Clear external embeds as VisuAlgo, Python Tutor, CircuitVerse, etc. enforce X-Frame-Options: SAMEORIGIN.
# This forces the generator to build custom, neobrutalist interactive p5.js/mermaid visuals instead.
EMBED_MAP = []

CONCEPT_DESCRIPTIONS = {
    # DSA
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
    # Computer Networks
    "routing": "Render a network of routers as nodes. Let the user drag nodes, edit link costs, and select source and destination. Show routing path step-by-step.",
    "ospf": "Render a network of routers. Let the user drag nodes and edit link costs. Highlight the Dijkstra shortest-path computation for routing tables.",
    "tcp": "Show sender and receiver windows as sliding boxes over numbered packets. Animate sends, acks, and window sliding.",
    "packet": "Show Layer-3 packet encapsulation: Animate a Packet (containing IP Header and Payload Data) descending. Then, show it being nested/encapsulated inside a larger Layer-2 Frame (adding MAC Header at the front and Frame Trailer/CRC at the back). Label MAC addresses and IP addresses clearly.",
    "frame": "Show Layer-3 packet encapsulation: Animate a Packet (containing IP Header and Payload Data) descending. Then, show it being nested/encapsulated inside a larger Layer-2 Frame (adding MAC Header at the front and Frame Trailer/CRC at the back). Label MAC addresses and IP addresses clearly.",
    "os scheduling": "Draw a Gantt chart animating process scheduling. Show process queue on left, CPU bar on right.",
    "page replacement": "Show page frames (3 frames) and a reference string. Animate each reference: hit in green, miss in red. Show fault counter.",
    # C Programming
    "pointer": "Show memory cells with addresses. Animate pointer assignment, dereferencing (arrow from variable to memory cell), pointer arithmetic (shifting address). Show & and * operators visually.",
    "array": "Show contiguous memory cells labelled with indices. Animate element access by index, insertion shifting elements right, deletion shifting left. Show base address calculation.",
    "struct": "Show a struct as a grouped block of labelled memory fields. Animate accessing members via dot operator and arrow operator for struct pointers.",
    "memory allocation": "Show a heap memory region. Animate malloc allocating a block (highlight in green), free deallocating (highlight in red). Show dangling pointer and memory leak scenarios.",
    "file handling": "Show a file icon connected to a FILE pointer. Animate fopen creating the connection, fread/fwrite transferring data blocks, fclose releasing the connection.",
    # Python Programming
    "list comprehension": "Show an input list transforming into an output list via a filter and map operation. Animate each element passing through the condition and transformation.",
    "decorator": "Show a function box being wrapped by a decorator function box. Animate the call flow: outer decorator receives function, returns wrapped version, call goes through wrapper first.",
    "generator": "Show a function with yield statements. Animate execution pausing at yield (saving state), resuming on next() call, producing values one at a time. Show memory efficiency vs list.",
    "class": "Show a class blueprint box with __init__, attributes, and methods. Animate creating instances as copies that share methods but have independent attribute values.",
    "exception": "Show a call stack with try/except blocks. Animate an exception being raised, propagating up the stack, and being caught by the matching except handler.",
    # Physics
    "electromagnetic": "Show electric and magnetic field vectors oscillating perpendicular to each other and to the propagation direction. Animate wave propagation. Show polarization planes.",
    "polarization": "Show unpolarized light as arrows in all directions. Animate passing through a polarizer, showing only one direction surviving. Show Malus's law with intensity.",
    "black body": "Show a cavity radiator emitting spectrum curves at different temperatures. Animate the peak shifting (Wien's law) and area growing (Stefan-Boltzmann). Show classical vs Planck curves.",
    "compton": "Show a photon hitting an electron. Animate the scattered photon with longer wavelength and the recoiling electron. Show wavelength shift formula.",
    "uncertainty": "Show a particle with position and momentum bars. Animate: narrowing position uncertainty widens momentum uncertainty and vice versa. Show Heisenberg's inequality.",
    "potential well": "Show a 1D infinite potential well with walls. Animate standing wave solutions for n=1,2,3. Show energy level quantization and probability density.",
    "band theory": "Show E-k diagram with valence and conduction bands. Animate electron excitation across the band gap. Compare metal, semiconductor, insulator band structures.",
    "laser": "Show energy levels for a 3-level or 4-level system. Animate absorption, spontaneous emission, stimulated emission, and population inversion. Show photon amplification.",
    "schrodinger": "Show the time-independent Schrodinger equation. Animate a wave function evolving in a potential. Show probability density |psi|^2.",
    "superconducti": "Show a material cooling below Tc. Animate resistance dropping to zero and magnetic flux being expelled (Meissner effect). Show Cooper pair formation.",
    "meissner": "Show a superconductor expelling magnetic field lines below Tc. Animate the transition from normal to superconducting state.",
    "ferromagnet": "Show magnetic domains with random orientations. Animate alignment under external field. Show hysteresis loop and saturation.",
    # Chemistry
    "spectroscop": "Show an electromagnetic spectrum with IR, UV-Vis, and microwave regions. Animate molecular transitions: rotational (microwave), vibrational (IR), electronic (UV-Vis).",
    "phase diagram": "Show a P-T phase diagram with solid, liquid, gas regions. Animate a point moving along a path crossing phase boundaries. Show triple point and critical point.",
    "electrochemi": "Show an electrochemical cell with anode, cathode, salt bridge, and external circuit. Animate electron flow and ion migration. Show Nernst equation.",
    "corrosion": "Show an iron surface with anodic and cathodic areas. Animate Fe oxidation at anode, O2 reduction at cathode, and rust formation. Show differential aeration.",
    "battery": "Show a battery cross-section with anode, cathode, separator, and electrolyte. Animate discharge: ions moving through electrolyte, electrons through external circuit.",
    "fuel cell": "Show H2-O2 fuel cell with membrane. Animate H2 oxidation at anode, O2 reduction at cathode, proton transport through membrane, water formation.",
    "nanomaterial": "Show particles at different scales (bulk vs nano). Animate surface-area-to-volume ratio increasing as size decreases. Show quantum confinement effect.",
    "polymer": "Show monomer units linking into a chain. Animate addition or condensation polymerization step by step. Show molecular weight distribution.",
    "oled": "Show OLED layer structure (anode, HTL, EML, ETL, cathode). Animate electron and hole injection, transport, recombination, and photon emission.",
    "green chemistry": "Show the 12 principles as a circular diagram. Highlight atom economy, waste prevention, and catalysis with animated examples.",
    "nernst": "Show an electrochemical cell. Animate changing ion concentrations and their effect on cell potential. Show the Nernst equation updating.",
    "gibbs": "Show a phase rule diagram. Animate degrees of freedom changing as components and phases change. Show F = C - P + 2.",
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
        if cached_viz.get("type") == "mermaid":
            cached_viz["code"] = _clean_mermaid_code(cached_viz["code"])
        return cached_viz

    # Fall back to generator (Mermaid or p5.js)
    concept_desc = _get_concept_description(topic_lower)
    try:
        vis = visualization_generator(topic, concept_desc, context)
        code = vis["code"]
        if vis["type"] == "mermaid":
            code = _clean_mermaid_code(code)
            
        viz_data = {
            "type": vis["type"],
            "url": "",
            "code": code,
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


def _clean_mermaid_code(code: str) -> str:
    import re
    # 1. Clean up style graph/flowchart keywords
    code = re.sub(r'style\s+(?:graph|flowchart|sequenceDiagram|stateDiagram-v2)\s+[^;\n]+(?:;)?', '', code, flags=re.IGNORECASE)
    # 2. Clean up labeled arrow typos (e.g. -->|Label|>) and wrap labels containing colons in quotes
    code = re.sub(r'-->\s*\|([^|]+)\|\s*>', r'-->|\1|', code)
    def quote_labels_with_colons(match):
        arrow = match.group(1)
        label = match.group(2)
        if ':' in label and not (label.startswith('"') and label.endswith('"')):
            return f'{arrow}|"{label}"|'
        return match.group(0)
    code = re.sub(r'([-=~.]+>|[-=~.]+)\s*\|([^|]+)\|', quote_labels_with_colons, code)
    # 3. Clean up edgeStyle styling
    code = re.sub(r'edgeStyle\s+[^;\n]+(?:;)?', '', code, flags=re.IGNORECASE)
    # 4. Clean up semicolons at the end of diagram headers (e.g. graph TD; or sequenceDiagram;)
    code = re.sub(r'^(\s*[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)?)\s*;', r'\1', code, flags=re.MULTILINE)
    # 5. Clean up trailing semicolons for sequence/state/class/er diagrams
    if re.search(r'^\s*(sequenceDiagram|stateDiagram|classDiagram|erDiagram)', code, flags=re.IGNORECASE | re.MULTILINE):
        code = re.sub(r';+\s*$', '', code, flags=re.MULTILINE)
    # 6. Clean up spaces after colons in style lines (e.g., style A fill: #FF0000 -> style A fill:#FF0000)
    def clean_style_line(match):
        return re.sub(r':\s+', ':', match.group(0))
    code = re.sub(r'^\s*style\s+.*$', clean_style_line, code, flags=re.MULTILINE | re.IGNORECASE)
    return code


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

