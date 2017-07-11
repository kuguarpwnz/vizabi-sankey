import { sankey, sankeyLinkHorizontal } from "d3-sankey";

const {
  Component,
  utils,
  iconset,
} = Vizabi;

const Sankey = Component.extend("sankey", {

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
        name: "markerEntities",
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
      "change:time.value": () => {
        if (this._readyOnce) {
          this._updateValues()
            .then(() => {
              this._redraw();
            });
        }
      }
    };

    this._super(config, context);
  },

  readyOnce() {
    this._initSettings();
    this._initBasics();
    this._initHeader();
    this._initFooter();
    this._initSankey();
  },

  _initBasics() {
    this._element = d3.select(this.element);
    this._svg = this._element.select(this._css.dot(this._css.classes.svg));
    this._defs = this._svg.select("defs");

    const formatNumber = d3.format(",.0f");
    this._format = d => `${formatNumber(d)} TWh`;

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    this._color = value => colorScale(value.replace(/ .*/, ""));

    this._translator = this.model.locale.getTFunction();

    this._calculateSize();
  },

  _initSettings() {
    this._settings = {
      nodeWidth: 15,
      nodePadding: 15,
      labelPadding: 5,
      iconMargin: 5,
    };

    this._profiles = {
      small: {
        iconSize: 16,
        margin: { top: 10, left: 10, bottom: 10, right: 10 },
      },
      medium: {
        iconSize: 16,
        margin: { top: 10, left: 10, bottom: 10, right: 10 },
      },
      large: {
        iconSize: 16,
        margin: { top: 10, left: 10, bottom: 10, right: 10 },
      },
    };

    this._presentationProfiles = {
      medium: {},
      large: {},
    };

    this._css = {
      dot: classNames => classNames.split(" ").filter(Boolean).map(c => `.${c}`).join(" "),

      classes: {
        svg: "vzb-sankey-svg",
        header: "vzb-sankey-header",
        headerText: "vzb-sankey-header-text",
        footer: "vzb-sankey-footer",
        footerText: "vzb-sankey-footer-text",
        info: "vzb-data-info-icon",
        warning: "vzb-data-warning-icon",
        nodesContainer: "nodes-container",
        node: "node",
        linksContainer: "links-container",
        link: "link",
      },
    };
  },

  _calculateSize() {
    this._width = utils.px2num(this._element.style("width"));
    this._height = utils.px2num(this._element.style("height"));
  },

  _initHeader() {
    this._header = this._svg.select(this._css.dot(this._css.classes.header));

    this._initHeaderText();
    this._initHeaderInfo();
  },

  _initHeaderText() {
    this._headerText = this._header.select(this._css.dot(this._css.classes.headerText))
      .on("click", () =>
        // TODO: fix
        this.parent
          .findChildByName("gapminder-treemenu")
          .markerID("axis_x")
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle()
      );
  },

  _initHeaderInfo() {
    const _this = this;

    this._info = this._header.select(this._css.dot(this._css.classes.info))
      .on("mouseover", function() {
        // TODO: check + fix
        const rect = this.getBBox();
        const ctx = utils.makeAbsoluteContext(this, this.farthestViewportElement);
        const coord = ctx(rect.x - 10, rect.y + rect.height + 10);

        _this.parent.findChildByName("gapminder-datanotes")
          .setHook("axis_x")
          .show()
          .setPos(coord.x, coord.y);
      })
      .on("mouseout", () => _this.parent.findChildByName("gapminder-datanotes").hide())
      .on("click", () => this.parent.findChildByName("gapminder-datanotes").pin());

    utils.setIcon(this._info, iconset.question)
      .select("svg")
      .attr("width", 0)
      .attr("height", 0);
  },

  _initFooter() {
    this._footer = this._svg.selectAll(this._css.dot(this._css.classes.footer));

    this._initFooterText();
    this._initFooterWarning();
  },

  _initFooterText() {
    this._footerText = this._footer.select(this._css.dot(this._css.classes.footerText))
      .text(this._translator("hints/dataWarning"));
  },

  _initFooterWarning() {
    this._warning = this._footer.select(this._css.dot(this._css.classes.warning))
      .on("mouseover", () => this._updateDoubtOpaciy(1))
      .on("mouseout", () => this._updateDoubtOpaciy(0))
      .on("click", () => this.parent.findChildByName("gapminder-datawarning").toggle());

    utils.setIcon(this._warning, iconset.warn)
      .select("svg")
      .attr("width", 0)
      .attr("height", 0);
  },

  _initSankey() {
    this._sankey = sankey()
      .nodeWidth(this._settings.nodeWidth)
      .nodePadding(this._settings.nodePadding)
      .sort(null);

    this._linksContainer = this._svg.select(this._css.dot(this._css.classes.linksContainer));
    this._nodesContainer = this._svg.select(this._css.dot(this._css.classes.nodesContainer));
  },


  ready() {
    this._setProfile();
    this._redrawHeader();
    this._redrawFooter();
    this._resizeSankey();
    this._updateValues()
      .then(() => {
        this._redraw();
      });
  },

  resize() {
    this._setProfile();
    this._calculateSize();
    this._redrawHeader();
    this._redrawFooter();
    this._resizeSankey();
    this._redraw();
  },

  _setProfile() {
    this._activeProfile = this.getActiveProfile(this._profiles, this._presentationProfiles);
  },

  _resizeSankey() {
    const headerBBox = this._header.node().getBBox();

    const footerBBox = this._footer.node().getBBox();

    this._sankey
      .extent([[
        this._activeProfile.margin.left,
        this._activeProfile.margin.top * 2 + headerBBox.height,
      ], [
        this._width - this._activeProfile.margin.right,
        this._height - this._activeProfile.margin.bottom * 2 - footerBBox.height,
      ]]);
  },

  _redraw() {
    this._sankey(this._graph);
    this._redrawLinks();
    this._redrawNodes();
  },

  _redrawHeader() {
    // TODO: change text to .getConceptProps().name
    this._headerText
      .text("HEADER TEXT");

    const headerTextBBox = this._headerText.node().getBBox();

    const headerTextPosition = {
      x: this._activeProfile.margin.left,
      y: this._activeProfile.margin.top + headerTextBBox.height,
    };

    this._headerText
      .attr("transform", `translate(${headerTextPosition.x}, ${headerTextPosition.y})`);

    const infoPosition = {
      x: this._activeProfile.margin.left + headerTextBBox.width + this._settings.iconMargin,
      y: this._activeProfile.margin.top,
    };

    this._info
      .attr("transform", `translate(${infoPosition.x}, ${infoPosition.y})`)
      .select("svg")
      .attr("width", this._activeProfile.iconSize)
      .attr("height", this._activeProfile.iconSize);
  },

  _redrawFooter() {
    const footerTextBBox = this._footerText.node().getBBox();

    const textPosition = {
      x: this._width - this._activeProfile.margin.right - footerTextBBox.width,
      y: this._height - this._activeProfile.margin.bottom,
    };

    this._footerText
      .attr("transform", `translate(${textPosition.x}, ${textPosition.y})`);

    const warningPosition = {
      x: (
        this._width
        - this._activeProfile.margin.right
        - footerTextBBox.width
        - this._activeProfile.iconSize
        - this._settings.iconMargin
      ),
      y: this._height - this._activeProfile.margin.bottom - this._activeProfile.iconSize,
    };

    this._warning
      .attr("transform", `translate(${warningPosition.x}, ${warningPosition.y})`)
      .select("svg")
      .attr("width", this._activeProfile.iconSize)
      .attr("height", this._activeProfile.iconSize);
  },

  _updateDoubtOpaciy(opaciy = 0) {

  },

  _redrawLinks() {
    const links = this._linksContainer.selectAll(this._css.dot(this._css.classes.link))
      .data(this._graph.links);

    links.exit().remove();

    const linksEnter = links.enter().append("path")
      .attr("class", this._css.classes.link);

    linksEnter
      .append("title");

    const mergedLinks = this._links = links.merge(linksEnter);

    mergedLinks
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .each(this._setDash)
      .style("stroke", d => this._createDef(d));

    mergedLinks.select("title")
      .text(d =>
        this.entities.label[d.source.name] + " → " + this.entities.label[d.target.name] + "\n" + this._format(d.value)
      );

  },

  _createDef(d) {
    const [
      sourceColor,
      targetColor,
    ] = [
      this.entities.color[d.source.name],
      this.entities.color[d.target.name],
    ].map(color => color.replace("#", ""));

    const id = `c-${sourceColor}-to-${targetColor}`;
    if (!this._defs.select("#" + id).node()) {
      const gradient = this._defs
        .append("linearGradient")
        .attr("gradientUnits", "userSpaceOnUse")
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
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`);
  },

  _redrawNodes() {
    const nodes = this._nodesContainer.selectAll(this._css.dot(this._css.classes.node))
      .data(this._graph.nodes);

    nodes.exit().remove();

    const nodesEnter = nodes.enter().append("g")
      .attr("class", this._css.classes.node);

    nodesEnter.append("rect");
    nodesEnter.append("text");
    nodesEnter.append("title");

    const mergedNodes = this._nodes = nodes.merge(nodesEnter);

    mergedNodes.select("rect")
      .transition().duration(300)
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => this.entities.color[d.name]);

    mergedNodes.select("text")
      .transition().duration(300)
      .attr("x", d => d.x0 - this._settings.labelPadding)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      // .attr("font-size", d => d.value * 2 + 10)
      .text(d => this.entities.label[d.name])
      .filter(d => d.x0 < this._width / 2)
      .attr("x", d => d.x1 + this._settings.labelPadding)
      .attr("text-anchor", "start");

    mergedNodes.select("title")
      .text(d => this.entities.label[d.name] + "\n" + this._format(d.value));
  },

  _getValues() {
    return Promise.all([
      new Promise(resolve =>
        this.model.marker.getFrame(this.model.time.value, values =>
          resolve(this.values = values)
        )
      ),
      new Promise(resolve =>
        this.model.markerEntities.getFrame(this.model.time.value, ({ color, label }) =>
          resolve(Object.assign(this, { entities: { color, label } }))
        )
      ),
    ]);
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
