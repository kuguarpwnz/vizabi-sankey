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
      "change:time.value": () => {
        if (this._readyOnce) {
          this._redraw();
        }
      }
    };

    this._super(config, context);
  },

  readyOnce() {
    this._element = d3.select(this.element);
    this._svg = this._element.select(".vzb-sk-svg");
  },


  ready() {
    this._redraw();
  },

  resize() {

  },

  async _redraw() {
    console.log(await this._getValues());
  },

  _getValues() {
    return new Promise(resolve =>
      this.model.marker.getFrame(
        this.model.time.value,
        values => resolve(this.values = values)
      )
    );
  },

});

export default Sankey;
