import { sankey, sankeyLinkHorizontal } from "d3-sankey";

const {
  utils,
} = Vizabi;

const Sankey = Vizabi.Component.extend({

  init(config, context) {
    this.name = "sankey-component";
    this.template = require("./template.html");

    this.model_expects = [
      {
        name: "time",
        type: "time"
      },
      {
        name: "entities",
        type: "entities"
      },
      {
        name: "marker",
        type: "model"
      },
      {
        name: "locale",
        type: "locale"
      },
      {
        name: "ui",
        type: "ui"
      }
    ];

    this.model_binds = {
      "change:time.value": async () => {
        if (this._readyOnce) {
          await this._updateValues();
          this._redraw();
        }
      }
    };

    this._super(config, context);
  },

  readyOnce() {
    this._initSettings();
    this._initBasics();
    this._initSankey();
  },

  _initBasics() {
    this._element = d3.select(this.element);
    this._svg = this._element.select(this.css.dot(this.css.classes.svg));

    const formatNumber = d3.format(",.0f");
    this._format = d => `${formatNumber(d)} TWh`;

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    this._color = value => colorScale(value.replace(/ .*/, ""));

    this._calculateSize();
  },

  _initSettings() {
    this._settings = {
      nodeWidth: 15,
      nodePadding: 15,
      labelPadding: 5,
      sankeyPadding: 10,
    };

    this.profiles = {
      small: {},
      medium: {},
      large: {},
    };

    this.presentationProfiles = {
      medium: {},
      large: {},
    };

    this.css = {
      dot: classNames => (
        classNames
          .split(" ")
          .filter(Boolean)
          .map(c => `.${c}`)
          .join(" ")
      ),

      classes: {
        svg: "vzb-sankey-svg",
        nodesContainer: "nodes-container",
        node: "node",
        linksContainer: "links-container",
        link: "link",
        gradientLinksContainer: "gradient-links-container",
        gradientLink: "gradient-link"
      },
    };
  },

  _calculateSize() {
    this._width = utils.px2num(this._element.style("width"));
    this._height = utils.px2num(this._element.style("height"));
  },

  _initSankey() {
    this._sankey = sankey()
      .nodeWidth(this._settings.nodeWidth)
      .nodePadding(this._settings.nodePadding);

    this._resizeSankey();

    // TODO: extract styles to css
    this._linksContainer = this._svg.append("g")
      .attr("class", this.css.classes.linksContainer)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.2);

    this._gradientLinksContainer = this._svg.append("g")
      .attr("class", this.css.classes.gradientLinksContainer)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.5);

    this._nodesContainer = this._svg.append("g")
      .attr("class", this.css.classes.nodesContainer)
      .attr("font-family", "sans-serif")
      .attr("font-size", 10);
  },


  async ready() {
    await this._updateValues();
    this._redraw();
  },

  resize() {
    this._calculateSize();
    this._resizeSankey();
    this._redraw();
  },

  _resizeSankey() {
    const { sankeyPadding } = this._settings;

    this._sankey
      .extent([[sankeyPadding, sankeyPadding], [
        this._width - sankeyPadding,
        this._height - sankeyPadding,
      ]]);
  },

  _redraw() {
    this._redrawSankey();
  },

  _redrawSankey() {
    this._sankey(this._graph);
    this._redrawLinks();
    this._redrawNodes();
  },

  _redrawLinks() {
    this._redrawDefaultLinks();
    this._redrawGradientLinks();
  },

  _redrawDefaultLinks() {
    const links = this._linksContainer.selectAll(this.css.dot(this.css.classes.link))
      .data(this._graph.links);

    links.exit().remove();

    const linksEnter = links.enter().append("path")
      .attr("class", this.css.classes.link);

    const mergedLinks = this._links = links.merge(linksEnter);

    const colorScale = this.model.marker.color.getScale();
    mergedLinks
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke", d => colorScale(this.values.color[d.source.name][d.target.name]));

    mergedLinks.select("title")
      .text(d => d.source.name + " → " + d.target.name + "\n" + this._format(d.value));
  },

  _redrawGradientLinks() {
    const gradientLinks = this._gradientLinksContainer.selectAll(this.css.dot(this.css.classes.gradientLink))
      .data(this._graph.links);

    gradientLinks.exit().remove();

    const gradientLinksEnter = gradientLinks.enter().append("path")
      .attr("class", this.css.classes.gradientLink);

    const mergedGradientLinks = this._gradientLinks = gradientLinks.merge(gradientLinksEnter);

    mergedGradientLinks
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .each(this._setDash)
      .style("stroke", d => this._createGradientDefs(d));
  },

  _createGradientDefs(d) {
    const [
      sourceColor,
      targetColor
    ] = [
      d.source.name,
      d.target.name
    ].map(name => this._color(name).replace("#", ""));

    const id = `c-${sourceColor}-to-${targetColor}`;
    if (!this._svg.select(`#${id}`).node()) {
      const defs = this._svg.select("defs");
      const gradient = (defs.size() ? defs : this._svg.append("defs"))
        .append("linearGradient")
        .attr("id", id)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#" + sourceColor)
        .attr("stop-opacity", 1);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#" + targetColor)
        .attr("stop-opacity", 1);
    }

    return "url(#" + id + ")";
  },

  _setDash() {
    const $this = d3.select(this);
    const totalLength = $this.node().getTotalLength();

    $this
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength);
  },

  _redrawNodes() {
    const nodes = this._nodesContainer.selectAll(this.css.dot(this.css.classes.node))
      .data(this._graph.nodes);

    nodes.exit().remove();

    const nodesEnter = nodes.enter().append("g")
      .attr("class", this.css.classes.node);
    nodesEnter.append("rect");
    nodesEnter.append("text");
    nodesEnter.append("title");

    const mergedNodes = this._nodes = nodes.merge(nodesEnter);

    mergedNodes
      .on("mouseover", (...args) => this._animateBranch(...args))
      .on("mouseout", () => {
        this._gradientLinks.transition();
        this._gradientLinks
          .style("opacity", 0)
          .each(this._setDash);
      });

    mergedNodes.select("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => this._color(d.name))
      .attr("stroke", "#000");

    mergedNodes.select("text")
      .attr("x", d => d.x0 - this._settings.labelPadding)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      // .attr("font-size", d => d.value * 2 + 10)
      .text(d => d.name)
      .filter(d => d.x0 < this._width / 2)
      .attr("x", d => d.x1 + this._settings.labelPadding)
      .attr("text-anchor", "start");

    mergedNodes.select("title")
      .text(d => d.name + "\n" + this._format(d.value));
  },

  _animateBranch(nodeData) {
    const nextLayerNodeData = [];
    const links = this._gradientLinksContainer.selectAll(this.css.dot(this.css.classes.gradientLink))
      .filter(gradientData => {
        const result = nodeData.sourceLinks.includes(gradientData);
        result && nextLayerNodeData.push(gradientData.target);
        return result;
      });

    links
      .style("opacity", null)
      .transition()
      .duration(300)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0)
      .on("end", () =>
        nextLayerNodeData.forEach(d =>
          this._animateBranch(d)
        )
      );
  },

  _getValues() {
    return new Promise(resolve =>
      this.model.marker.getFrame(this.model.time.value, values =>
        resolve(this.values = values)
      )
    );
  },

  _buildGraph() {
    const graph = { nodes: [], links: [] };

    Object.keys(this.values.size).forEach(source => {
      const nested = this.values.size[source];

      graph.nodes.push({ name: source });

      Object.keys(nested).forEach(target => {
        graph.nodes.push({ name: target });

        graph.links.push({
          source,
          target,
          value: nested[target]
        });
      });
    });

    graph.nodes = graph.nodes
      .map(d => d.name)
      .filter((v, i, a) => i === a.indexOf(v));

    graph.links.forEach(d => {
      d.source = graph.nodes.indexOf(d.source);
      d.target = graph.nodes.indexOf(d.target);
    });

    graph.nodes = graph.nodes.map(name => ({ name }));

    return this._graph = graph;
  },

  _updateValues() {
    return this._getValues()
      .then(() => this._buildGraph());
  },

});

export default Sankey;
