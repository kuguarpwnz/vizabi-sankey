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
        name: "entitiesAll",
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
      "change:time.playing": () =>
        this._updateAllLabelsOpacity(),

      "change:time.value": () =>
        this._updateValues()
          .then(() => this._redraw()),

      "change:markerEntities.select": () => {
        this._highlightEntities();
        this._updateAllLabelsOpacity();
      },

      "change:markerEntities.highlight": () => {
        this._unhighlightEntities();
        this._highlightEntities();
        this._updateAllLabelsOpacity();
      },
    };

    this._super(config, context);
  },

  readyOnce() {
    this._initSettings();
    this._setProfile();
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

    this._translator = this.model.locale.getTFunction();

    this._calculateSize();
  },

  _initSettings() {
    this._settings = {
      nodeWidth: 15,
      labelPadding: 5,
      iconMargin: 5,
      gradientTransitionDuration: 300,
    };

    this._profiles = {
      small: {
        iconSize: 16,
        nodePadding: 3,
        margin: { top: 10, left: 10, bottom: 10, right: 10 },
      },
      medium: {
        iconSize: 16,
        nodePadding: 6,
        margin: { top: 10, left: 10, bottom: 10, right: 10 },
      },
      large: {
        iconSize: 16,
        nodePadding: 10,
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
        defaultText: "default-text",
        strokeText: "stroke-text",
        stroke: "stroke",
        linksContainer: "links-container",
        link: "link",
        gradientLinksContainer: "gradient-links-container",
        gradientLink: "gradient-link",
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
        this.parent
          .findChildByName("gapminder-treemenu")
          .markerID("size")
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
        const rect = this.getBBox();
        const ctx = utils.makeAbsoluteContext(this, this.farthestViewportElement);
        const coord = ctx(rect.x - 10, rect.y + rect.height + 10);

        _this.parent.findChildByName("gapminder-datanotes")
          .setHook("size")
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
      .nodePadding(this._activeProfile.nodePadding);

    this._linksContainer = this._svg.select(this._css.dot(this._css.classes.linksContainer));
    this._gradientLinksContainer = this._svg.select(this._css.dot(this._css.classes.gradientLinksContainer));
    this._nodesContainer = this._svg.select(this._css.dot(this._css.classes.nodesContainer));
  },


  ready() {
    this._setProfile();
    this._redrawHeader();
    this._redrawFooter();
    this._resizeSankey();
    this._makeMaxValuesGraph()
      .then(() => this._updateValues())
      .then(() => {
        this._redraw();
        this._updateAllLabelsOpacity();
      });
  },

  resize() {
    this._setProfile();
    this._calculateSize();
    this._redrawHeader();
    this._redrawFooter();
    this._resizeSankey();
    this._redraw();
    this._updateAllLabelsOpacity();
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
    this._sankey
      .nodePadding(this._activeProfile.nodePadding);

    this._sankey(this._graph);

    this._getAnimationDuration();
    this._adaptToMaxValues();
    this._redrawLinks();
    this._redrawNodes();
    this._highlightEntities();
  },

  _adaptToMaxValues() {
    this._sankey(this._maxValuesGraph = this._buildGraph(this._maxValues));

    const [nodeData] = this._maxValuesGraph.nodes;
    const graphRatio = nodeData.value / this._getNodeHeight(nodeData);

    this._graph.nodes = this._graph.nodes.map((node, i) => {
      const nodeData = this._maxValuesGraph.nodes[i];
      const maxValueNodeCenter = nodeData.y0 + this._getNodeHeight(nodeData) / 2;
      const halfNodeHeight = node.value / graphRatio / 2;

      return Object.assign(node, {
        y0: maxValueNodeCenter - halfNodeHeight,
        y1: maxValueNodeCenter + halfNodeHeight,
      });
    });

    this._graph.links = this._graph.links.map((link, i) =>
      Object.assign(link, {
        width: link.value / graphRatio,
      })
    );

    this._sankey.update(this._graph);
  },

  _getAnimationDuration() {
    const { time } = this.model;
    this._prevTime = this._nextTime || time.value;
    this._nextTime = time.value;

    return this._duration = time.playing && this._nextTime - this._prevTime > 0 ? time.delayAnimations : 0;
  },

  _redrawHeader() {
    this._headerText
      .text(this.model.marker.size.getConceptprops().name);

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
    this._redrawDefaultLinks();
    this._redrawGradientLinks();
  },

  _redrawDefaultLinks() {
    const links = this._linksContainer.selectAll(this._css.dot(this._css.classes.link))
      .data(this._graph.links);

    links.exit().remove();

    const linksEnter = links.enter().append("path")
      .attr("class", this._css.classes.link);

    linksEnter.append("title");

    const mergedLinks = this._links = links.merge(linksEnter);

    mergedLinks
      .transition().duration(this._duration)
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .style("stroke", d => this._createGradientDef(d));

    mergedLinks.select("title")
      .text(d => {
        const { value, source, target } = d;
        const { label } = this._entities;

        return label[source.name] + " → " + label[target.name] + "\n" + this._format(value);
      });
  },

  _redrawGradientLinks() {
    const gradientLinks = this._gradientLinksContainer.selectAll(this._css.dot(this._css.classes.gradientLink))
      .data(this._graph.links);

    gradientLinks.exit().remove();

    const gradientLinksEnter = gradientLinks.enter().append("path")
      .attr("class", this._css.classes.gradientLink);

    const mergedGradientLinks = this._gradientLinks = gradientLinks.merge(gradientLinksEnter);

    mergedGradientLinks
      .style("opacity", 0);

    (this._duration ? mergedGradientLinks.transition().duration(this._duration) : mergedGradientLinks)
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .each(this._setDash)
      .style("stroke", d => this._createGradientDef(d));
  },

  _createGradientDef(d) {
    const [
      sourceColor,
      targetColor,
    ] = [
      this._entities.color[d.source.name],
      this._entities.color[d.target.name],
    ].map(color => color.replace("#", ""));

    const id = `c-${sourceColor}-to-${targetColor}`;
    if (!this._defs.select("#" + id).node()) {
      const gradient = this._defs
        .append("linearGradient")
        .attr("id", id)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

      const roundTo = 10;
      const areNodesHorizontallyEqual = (
        d.source.y0.toFixed(roundTo) === d.target.y0.toFixed(roundTo)
        && d.source.y1.toFixed(roundTo) === d.target.y1.toFixed(roundTo)
      );

      areNodesHorizontallyEqual && gradient.attr("gradientUnits", "userSpaceOnUse");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#" + sourceColor)
        .attr("stop-opacity", 1);

      gradient.append("stop")
        .attr("offset", `${areNodesHorizontallyEqual ? 50 : 100}%`)
        .attr("stop-color", "#" + targetColor)
        .attr("stop-opacity", 1);
    }

    return "url(#" + id + ")";
  },

  _setDash() {
    const $this = d3.select(this);
    const totalLength = $this.node().getTotalLength();

    $this
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength);
  },

  _redrawNodes() {
    const _this = this;

    const { markerEntities } = this.model;

    const nodes = this._nodesContainer.selectAll(this._css.dot(this._css.classes.node))
      .data(this._graph.nodes);

    nodes.exit().remove();

    const nodesEnter = nodes.enter().append("g")
      .attr("class", this._css.classes.node);

    nodesEnter.append("rect");
    nodesEnter.append("title");
    nodesEnter.append("text")
      .classed(this._css.classes.strokeText, true);
    nodesEnter.append("text")
      .classed(this._css.classes.defaultText, true)
      .classed(this._css.classes.stroke, true);

    const mergedNodes = this._nodes = nodes.merge(nodesEnter);

    mergedNodes
      .on("mouseover", d => markerEntities.highlightMarker(d))
      .on("mouseout", d => markerEntities.clearHighlighted(d))
      .on("click", d => markerEntities.selectMarker(d));

    mergedNodes.select("rect")
      .transition().duration(this._duration)
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", this._getNodeHeight)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => this._entities.color[d.name]);

    let isPaintOrderAvailable = true;
    const textCallback = function(d) {
      const view = d3.select(this);
      isPaintOrderAvailable = view.style("paint-order").length > 0;

      const isRtlText = d.x0 < _this._width / 2;
      const x = isRtlText ?
        d.x1 + _this._settings.labelPadding :
        d.x0 - _this._settings.labelPadding;
      const textAnchor = isRtlText ? "start" : "end";

      view
        .transition().duration(_this._duration)
        .attr("x", x)
        .attr("y", (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", textAnchor)
        .text(_this._entities.label[d.name]);

      return view;
    };

    mergedNodes.select(this._css.dot(this._css.classes.defaultText))
      .each(textCallback);

    const strokeTextSelection = mergedNodes.select(this._css.dot(this._css.classes.strokeText));
    if (isPaintOrderAvailable) {
      strokeTextSelection.remove();
    } else {
      strokeTextSelection.each(textCallback);

      mergedNodes.select(this._css.dot(this._css.classes.defaultText))
        .classed("stroke", false);
    }


    mergedNodes.select("title")
      .text(d => this._entities.label[d.name] + "\n" + this._format(d.value));
  },

  _getNodeHeight(d) {
    return d.y1 - d.y0;
  },

  _updateAllLabelsOpacity() {
    const _this = this;

    this._nodes.select("text")
      .each(function(d) {
        _this._updateLabelOpacity(d, d3.select(this));
      });
  },

  _updateLabelOpacity(d, view) {
    const { markerEntities } = this.model;

    const nodeHeightWithPadding = this._getNodeHeight(d) + this._activeProfile.nodePadding;
    const visibility = (
      nodeHeightWithPadding >= view.node().getBBox().height
      || markerEntities.isSelected(d)
      || markerEntities.isHighlighted(d) ?
        null :
        "hidden"
    );

    view
      .style("visibility", visibility);
  },

  _getLayer(filter) {
    const anotherLayerLinksData = [];

    const links = this._gradientLinks
      .filter(linkData => filter(linkData, anotherLayerLinksData));

    return {
      links,
      anotherLayerLinksData,
    };
  },

  _getPrevLayer(nodeData) {
    return this._getLayer(
      (linkData, anotherLayerLinksData) => {
        const result = nodeData.targetLinks.includes(linkData);
        result && anotherLayerLinksData.push(linkData.source);
        return result;
      }
    );
  },

  _getNextLayer(nodeData) {
    return this._getLayer(
      (linkData, anotherLayerLinksData) => {
        const result = nodeData.sourceLinks.includes(linkData);
        result && anotherLayerLinksData.push(linkData.target);
        return result;
      }
    );
  },

  _highlightBranches(nodeData, isAnimation = false) {
    this._highlightPrevLayer(nodeData, isAnimation);
    this._highlightNextLayer(nodeData, isAnimation);
  },

  _highlightPrevLayer(nodeData, isAnimation) {
    const {
      links,
      anotherLayerLinksData,
    } = this._getPrevLayer(nodeData);

    const preparedLinks = links.attr("stroke-dashoffset", function() {
      return -Math.abs(d3.select(this).attr("stroke-dashoffset"));
    });

    this._highlightLayer(preparedLinks, isAnimation)
      .then(() => anotherLayerLinksData.forEach(d => this._highlightPrevLayer(d, isAnimation)));
  },

  _highlightNextLayer(nodeData, isAnimation) {
    const {
      links,
      anotherLayerLinksData,
    } = this._getNextLayer(nodeData);

    this._highlightLayer(links, isAnimation)
      .then(() => anotherLayerLinksData.forEach(d => this._highlightNextLayer(d, isAnimation)));
  },

  _highlightLayer(links, isAnimation) {
    const highlight = links =>
      isAnimation ?
        links
          .attr("stroke-dashoffset", 0) :
        links
          .attr("stroke-dashoffset", null)
          .attr("stroke-dasharray", null);

    links.style("opacity", null);

    return new Promise(resolve => {
      if (isAnimation) {
        highlight(
          links
            .transition()
            .duration(this._settings.gradientTransitionDuration)
            .ease(d3.easeLinear)
        ).on("end", resolve);
      } else {
        highlight(links);
        resolve();
      }
    });
  },

  _highlightEntities() {
    const _this = this;

    const { markerEntities } = this.model;
    const areSomeSelected = markerEntities.getSelected().length;

    this._nodes
      .each(function(d) {
        const isSelected = markerEntities.isSelected(d);
        const isHighlighted = markerEntities.isHighlighted(d);

        d3.select(this)
          .classed("darkened", areSomeSelected && !isSelected);

        if (isSelected || isHighlighted) {
          _this._highlightBranches(d, isHighlighted && !isSelected);
        }
      });
  },

  _unhighlightEntities() {
    this._gradientLinks
      .interrupt()
      .style("opacity", 0)
      .each(this._setDash);
  },

  _makeMaxValuesGraph() {
    return this._getAllValues()
      .then(() => this._getMaxValues());
  },

  _getMaxValues() {
    return this._maxValues = Object.keys(this._allValues)
      .reduce((result, time, index) => {
        const currentYearValues = this._allValues[time].size;

        Object.keys(currentYearValues)
          .forEach(sourceKey => {
            const source = currentYearValues[sourceKey];
            !index && (result[sourceKey] = {});
            const resultSource = result[sourceKey];

            Object.keys(source)
              .forEach(targetKey => {
                const value = source[targetKey];
                (!index || resultSource[targetKey] < value) && (resultSource[targetKey] = value);
              });
          });

        return result;
      }, {});
  },

  _getAllValues() {
    return new Promise(resolve =>
      this.model.marker.getFrame(null, _allValues =>
        resolve(Object.assign(this, { _allValues }))
      )
    );
  },

  _getValues() {
    return Promise.all([
      new Promise(resolve =>
        this.model.markerEntities.getFrame(this.model.time.value, ({ color, label }) =>
          resolve(Object.assign(this, { _entities: { color, label } }))
        )
      ),
      new Promise(resolve => {
        const _values = this._allValues[this.model.time.value];

        _values ?
          resolve(Object.assign(this, { _values })) :
          this.model.marker.getFrame(this.model.time.value, _values =>
            resolve(Object.assign(this, { _values }))
          );
      })
    ]);
  },

  _buildGraph(values) {
    const graph = { nodes: [], links: [] };

    Object.keys(values).forEach(source => {
      const nested = values[source];

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

    const dim = this.model.entitiesAll.getDimension();
    graph.nodes = graph.nodes.map(name => ({ [dim]: name, name }));

    return graph;
  },

  _updateValues() {
    return this._getValues()
      .then(() => this._graph = this._buildGraph(this._values.size));
  },

});

export default Sankey;
