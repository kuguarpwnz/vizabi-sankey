import "./styles.scss";
import component from "./component";

export default Vizabi.Tool.extend("Sankey", {

  init(placeholder, externalModel) {

    this.name = "sankey";

    this.components = [
      {
        component,
        placeholder: ".vzb-tool-viz",
        model: [
          "state.time",
          "state.entities",
          "state.entities_all",
          "state.marker",
          "state.marker_entities",
          "locale",
          "ui",
        ]
      },
      {
        component: Vizabi.Component.get("timeslider"),
        placeholder: ".vzb-tool-timeslider",
        model: ["state.time", "state.entities", "state.marker", "ui"]
      },
      {
        component: Vizabi.Component.get("dialogs"),
        placeholder: ".vzb-tool-dialogs",
        model: ["state", "ui", "locale"]
      },
      {
        component: Vizabi.Component.get("buttonlist"),
        placeholder: ".vzb-tool-buttonlist",
        model: ["state", "ui", "locale"]
      },
      {
        component: Vizabi.Component.get("treemenu"),
        placeholder: ".vzb-tool-treemenu",
        model: ["state.marker", "state.marker_tags", "state.time", "locale"]
      },
      {
        component: Vizabi.Component.get("datanotes"),
        placeholder: ".vzb-tool-datanotes",
        model: ["state.marker", "locale"]
      },
      {
        component: Vizabi.Component.get("datawarning"),
        placeholder: ".vzb-tool-datawarning",
        model: ["locale"]
      },
      {
        component: Vizabi.Component.get("steppedspeedslider"),
        placeholder: ".vzb-tool-stepped-speed-slider",
        model: ["state.time", "locale"]
      }
    ];

    this._super(placeholder, externalModel);
  },

  default_model: {}

});
