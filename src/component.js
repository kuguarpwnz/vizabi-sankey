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
    this._initBasics();
    this._initSankey();
  },

  _initBasics() {
    this._element = d3.select(this.element);
    this._svg = this._element.select(".vzb-sankey-svg");

    const formatNumber = d3.format(",.0f");
    this._format = d => `${formatNumber(d)} TWh`;
    this._color = d3.scaleOrdinal(d3.schemeCategory10);

    this._initSettings();
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

    this._links = this._svg.append("g")
      .attr("class", "links")
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.2)
      .selectAll("path");

    this._nodes = this._svg.append("g")
      .attr("class", "nodes")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .selectAll("g");
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
    this._links = this._links
      .data(this._graph.links);

    this._links.exit().remove();

    var _this = this;
    this._links = this._links
      .enter().append("path")
      .merge(this._links)
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke", d => {
        return _this.model.marker.color.getScale()(this.values.color[d.source.name][d.target.name]);
      });

    this._links.append("title")
      .text(d => d.source.name + " → " + d.target.name + "\n" + this._format(d.value));
  },

  _redrawNodes() {
    this._nodes = this._nodes
      .data(this._graph.nodes);

    this._nodes.exit().remove();

    this._nodes = this._nodes
      .enter().append("g")
      .each(function() {
        const $this = d3.select(this);

        $this.append("rect");
        $this.append("text");
        $this.append("title");
      })
      .merge(this._nodes);

    this._nodes
      .selectAll("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => this._color(d.name.replace(/ .*/, "")))
      .attr("stroke", "#000");

    this._nodes.selectAll("text")
      .attr("x", d => d.x0 - this._settings.labelPadding)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("font-size", d => d.value*2 + 10)
      .text(d => d.name)
      .filter(d => d.x0 < this._width / 2)
      .attr("x", d => d.x1 + this._settings.labelPadding)
      .attr("text-anchor", "start");

    this._nodes.selectAll("title")
      .text(d => d.name + "\n" + this._format(d.value));
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
