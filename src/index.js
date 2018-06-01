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
          "state.marker_links",
          "state.marker",
          "locale",
          "ui",
        ]
      },
      {
        component: Vizabi.Component.get("timeslider"),
        placeholder: ".vzb-tool-timeslider",
        model: ["state.time", "state.marker_links", "ui"]
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
        model: ["state.marker", "state.time", "locale", "ui"]
      },
      {
        component: Vizabi.Component.get("datanotes"),
        placeholder: ".vzb-tool-datanotes",
        model: ["state.marker_links", "locale"]
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

  default_model: {
  
    state: {
      time: {
        "autoconfig": {
          "type": "time"
        }
      },
      entities: {
        "autoconfig": {
          "type": "entity_domain",
          index: 0,
          "excludeIDs": ["tag"]
        }
      },
      entities_from: {
        "autoconfig": {
          "type": "entity_domain",
          index: 1,
          "excludeIDs": ["tag"]
        }
      },
      entities_to: {
        "autoconfig": {
          "type": "entity_domain",
          index: 2,
          "excludeIDs": ["tag"]
        }
      },
      marker_links: {
        space: [
          "entities_from",
          "entities_to",
          "time"
        ],
        size: {
          "autoconfig": {
              index: 0,
              type: "measure"
            }
        }
      },
      marker: {
        space: ["entities"],
        label: {
          use: "property",
          autoconfig: {
            includeOnlyIDs: ["name"],
            type: "string"
          }
        },
        color: {
          "autoconfig": {}
        },
        hook_rank: {
          "autoconfig": {}
        }
      }
    },
    locale: { },
    ui: {
      chart: {
        nodeSortingByHook: false //set to true and use "hook_rank" to sort the nodes, set to false or ommit for automatic sorting
      },
      buttons: ["find", "moreoptions", "presentation"],
      dialogs: {
        popup: ["timedisplay", "find", "moreoptions"],
        sidebar: ["timedisplay", "find"],
        moreoptions: ["speed", "about"]
      },
      splash: true
    }
  }

});
