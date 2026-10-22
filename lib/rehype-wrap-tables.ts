// Wraps every <table> produced from Markdown in <div class="table-wrap"> so wide tables scroll
// sideways on a phone instead of being clipped by the article card.
type Node = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: Node[] };

export function rehypeWrapTables() {
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName === "table") {
          return { type: "element", tagName: "div", properties: { className: ["table-wrap"] }, children: [child] };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}
