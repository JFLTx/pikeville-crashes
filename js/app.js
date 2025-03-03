(async function () {
  "use strict";

  // ------------------------------
  // Utility Functions and Globals
  // ------------------------------

  // Spinner functions
  const spinner = document.querySelector(".spinner-container");
  function showSpinner() {
    spinner.style.display = "flex";
  }
  function hideSpinner() {
    spinner.style.display = "none";
  }

  // Filter Variables
  let mannerFilter = null;
  let modeFilter = null;
  let currentTimeRange = [0, 2359]; // Default to "All Crashes" range

  // Layer properties for crash severities
  const layerProps = [
    {
      id: "K",
      text: "Fatal Crash (K)",
      color: "#290003",
      size: 12,
      checked: true,
    },
    {
      id: "A",
      text: "Serious Injury Crash (A)",
      color: "#75000A",
      size: 10,
      checked: true,
    },
    {
      id: "B",
      text: "Minor Injury Crash (B)",
      color: "#BA4149",
      size: 7.5,
      checked: true,
    },
    {
      id: "C",
      text: "Possible Injury Crash (C)",
      color: "#E68186",
      size: 6,
      checked: true,
    },
    {
      id: "O",
      text: "Property Damage Only (O)",
      color: "#FFD9DC",
      size: 4,
      checked: true,
    },
  ];

  // Manner of Collision mapping
  const mannerOfCollisionMapping = {
    1: "Angle",
    2: "Backing",
    3: "Head On",
    4: "Opposing Left Turn",
    5: "Rear End",
    6: "Rear to Rear",
    7: "Sideswipe-Opposite Direction",
    8: "Sideswipe-Same Direction",
    9: "Single Vehicle",
  };

  // Mode mapping
  const modeMapping = {
    Bicyclists: ["Bicyclist"],
    Pedestrians: ["Pedestrian"],
    Motorcyclists: ["Motorcyclist"],
    "Intersection Crashes": ["Intersection Crash"],
    "Motor Vehicles": [
      "Young Driver",
      "Commercial Vehicle",
      "Mature Driver",
      "Distracted",
      "Aggressive",
      "Impaired",
      "Unrestrained",
      "Roadway Departure",
      "Median Cross-over",
    ],
  };

  // Time groups for slider
  const timeGroups = [
    { label: "All Crashes", range: [0, 2359] },
    { label: "12:00 AM - 2:59 AM", range: [0, 259] },
    { label: "3:00 AM - 5:59 AM", range: [300, 559] },
    { label: "6:00 AM - 8:59 AM", range: [600, 859] },
    { label: "9:00 AM - 11:59 AM", range: [900, 1159] },
    { label: "12:00 PM - 2:59 PM", range: [1200, 1459] },
    { label: "3:00 PM - 5:59 PM", range: [1500, 1759] },
    { label: "6:00 PM - 8:59 PM", range: [1800, 2059] },
    { label: "9:00 PM - 11:59 PM", range: [2100, 2359] },
  ];

  // ------------------------------
  // DOM Elements & Dropdown Population
  // ------------------------------
  const dropdown = document.getElementById("collision-filter");
  const modeDropdown = document.getElementById("mode-filter");
  const slider = document.getElementById("slider-controls");
  const sliderLabel = document.getElementById("slider-label");

  // Populate the collision dropdown
  Object.entries(mannerOfCollisionMapping).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value;
    dropdown.appendChild(option);
  });

  // ------------------------------
  // Map Initialization
  // ------------------------------
  const mapOptions = {
    zoomSnap: 0.1,
    center: [37.4769, -82.5242],
    zoom: 12,
  };
  const map = L.map("map", mapOptions);
  // Create panes for ordering layers
  const setPanes = ["bottom", "middle", "top"];
  setPanes.forEach((pane, i) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 401 + i;
  });
  // Add base tile layers
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Imagery &copy; Esri",
    }
  ).addTo(map);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PEC',
      pane: "top",
    }
  ).addTo(map);

  // ------------------------------
  // Data Filtering and Rendering Functions
  // ------------------------------
  function timeFilter(filteredData, timeRange) {
    return filteredData.filter((row) => {
      const crashTime = parseInt(row.CollisionTime, 10);
      return crashTime >= timeRange[0] && crashTime <= timeRange[1];
    });
  }

  function renderCrashes(data, crashLayers, mannerFilter, modeFilter) {
    Object.values(crashLayers).forEach((layerGroup) =>
      layerGroup.clearLayers()
    );
    data.forEach((row) => {
      const lat = parseFloat(row.Latitude);
      const lng = parseFloat(row.Longitude);
      const kabco = row.KABCO;
      if (isNaN(lat) || isNaN(lng)) return;
      const layerProp = layerProps.find((p) => p.id === kabco);
      if (!layerProp) return;
      if (mannerFilter && row.MannerofCollisionCode !== mannerFilter) return;
      if (
        modeFilter &&
        !modeMapping[modeFilter].some((factor) => row[factor] === "1")
      )
        return;

      const popupContent = `
          <u>KABCO</u>: ${layerProp.text}<br>
          <u>Manner of Collision</u>: ${
            mannerOfCollisionMapping[row.MannerofCollisionCode]
          }<br>
        `;
      const marker = L.circleMarker([lat, lng], {
        radius: layerProp.size,
        fillColor: layerProp.color,
        color: "#444",
        weight: 0.5,
        opacity: 1,
        fillOpacity: 1,
        pane: "top",
      });
      marker.bindPopup(popupContent);
      marker.on("mouseover", function () {
        this.setStyle({ color: "#00ffff", weight: 2 });
      });
      marker.on("mouseout", function () {
        this.setStyle({ color: "#444", weight: 0.5 });
      });
      crashLayers[kabco].addLayer(marker);
    });
  }

  // ------------------------------
  // Main Data Loading & Rendering
  // ------------------------------
  async function fetchData() {
    showSpinner();

    // Load crash CSV and various GeoJSON files using await
    const [crashData, cityLimits, pikeCo, pikevilleHIN, highwayPlan] =
      await Promise.all([
        d3.csv("data/pike-county-crashes-JFLT-udpated4.csv"),
        d3.json("data/pikeville-study-area2.geojson"),
        d3.json("data/pike-county.geojson"),
        d3.json("data/pikevilleHIN.geojson"),
        d3.json("data/current-2025-highway-plan.geojson"),
      ]);

    // Filter crash data
    const filteredData = crashData.filter(
      (row) => row.ParkingLotIndicator !== "Y" && row.CityCrash == 1
    );

    // Initialize crashLayers and layersLabels for crash severities
    const crashLayers = {};
    const layersLabels = {};

    const cityLayer = L.geoJSON(cityLimits, {
      style: function (feature) {
        return { color: "rgba(255, 255, 0, 0.5)", weight: 4, fillOpacity: 0 };
      },
    }).addTo(map);
    const bounds = cityLayer.getBounds().pad(1);
    map.fitBounds(cityLayer.getBounds(), { padding: [50, 75] });
    map.setMaxBounds(bounds);
    L.geoJSON(pikeCo, {
      style: function (feature) {
        return { color: "#888", weight: 4, fillOpacity: 0 };
      },
    }).addTo(map);
    const hinStyle = { color: "#FF0000", weight: 4, fillOpacity: 0 };

    const highwayPlanStyle = {
      color: "#1F389B",
      weight: 4,
      fillOpacity: 0,
    };

    const pikevilleHINLayer = L.geoJSON(pikevilleHIN, {
      style: hinStyle,
      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        const popupContent = `
          <h2>High Injury Network <br> Rank: ${props["Rank EPDO/ Mile"]}</h2><br><br>
          <u>Route ID</u>: ${props["ID"]}<br>
          <u>Route Name</u>: ${props["Route Name"]}<br>
          <u>KA/Mile</u>: ${props["KA/MILE"]}<br>
          <u>Proposed Improvement</u>: ${props["Improvement"]}
        `;
        layer.bindPopup(popupContent);
        layer.on("mouseover", function () {
          layer.setStyle({ color: "cyan", weight: 6 });
        });
        layer.on("mouseout", function () {
          layer.setStyle(hinStyle);
        });
      },
    }).addTo(map);

    const highwayPlanLayer = L.geoJSON(highwayPlan, {
      style: highwayPlanStyle,
      onEachFeature: function (feature, layer) {
        // console.log(feature.properties);
        const props = feature.properties;
        const popupContent = `
          <h2>Current Highway Plan <br>
          KYTC No: ${props["Item No#"]}</h2><br><br>
          <u>Route ID</u>: ${props["Route"]}<br>
          <u>Begin MP</u>: ${props["Begin MP"]}<br>
          <u>End MP</u>: ${props["End MP"]}<br>
        `;
        layer.bindPopup(popupContent);


        layer.on("mouseover", function () {
          layer.setStyle({
            color: "cyan",
            weight: 6,
          });
        });

        layer.on("mouseout", function () {
          layer.setStyle(highwayPlanStyle);
        });
      },
    }).addTo(map);

    // Process the data
    filteredData.forEach((row) => {
      if (!["K", "A", "B", "C", "O"].includes(row.KABCO)) {
        row.KABCO = "O";
      }
      if (
        !Object.keys(mannerOfCollisionMapping).includes(
          row.MannerofCollisionCode
        )
      ) {
        row.MannerofCollisionCode = "UNKNOWN";
      }
    });

    // Build crashLayers and legend labels for crash severities (with counts)
    layerProps.forEach((prop) => {
      crashLayers[prop.id] = L.layerGroup().addTo(map);
      const count = filteredData.filter((row) => row.KABCO === prop.id).length;
      const maxSize = Math.max(...layerProps.map((p) => p.size));
      const margin = maxSize - prop.size;
      const circleSymbol = `<span style="display: inline-block; width: ${
        prop.size * 2
      }px; height: ${prop.size * 2}px; background-color: ${
        prop.color
      }; border: 0.1px solid #444; border-radius: 50%; margin-left: ${margin}px; margin-right: ${
        margin + 5
      }px; vertical-align: middle; line-height: 0;"></span>`;
      const labelHTML = `<span class="legend-text" style="color: ${
        prop.color
      }; display: inline-block;">
        ${circleSymbol}${prop.text} (${count.toLocaleString()})
      </span>`;
      layersLabels[labelHTML] = crashLayers[prop.id];
    });

    const pikevilleHINSymbol = `<span style="display:inline-block; width:20px; height:4px; background-color:#FF0000; margin-right:9px; vertical-align:middle;"></span>`;
    const hinLabel = `<span class="legend-text" style="color:#FF0000; display:inline-block;">
        ${pikevilleHINSymbol}High Injury Network
      </span>`;
    layersLabels[hinLabel] = pikevilleHINLayer;

    const highwayPlanSymbol = `<span style="display:inline-block; width:20px; height:4px; background-color:#1F389B; margin-right:9px; vertical-align:middle;"></span>`;
    const highwayLabel = `<span class="legend-text" style="color:#1F389B; display:inline-block;">
        ${highwayPlanSymbol}Current Highway Plan Projects
      </span>`;
    layersLabels[highwayLabel] = highwayPlanLayer;

    // Render crashes initially
    renderCrashes(filteredData, crashLayers, null, null);

    // Set up slider and dropdown event listeners for crash data filtering
    slider.addEventListener("input", function (e) {
      const index = e.target.value;
      currentTimeRange = timeGroups[index].range;
      sliderLabel.textContent = timeGroups[index].label;
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        if (mannerFilter && row.MannerofCollisionCode !== mannerFilter)
          return false;
        if (
          modeFilter &&
          !modeMapping[modeFilter].some((factor) => row[factor] === "1")
        )
          return false;
        return true;
      });
      renderCrashes(filtered, crashLayers);
    });
    dropdown.addEventListener("change", (e) => {
      mannerFilter = e.target.value;
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        return (
          (!mannerFilter || row.MannerofCollisionCode === mannerFilter) &&
          (!modeFilter ||
            modeMapping[modeFilter].some((factor) => row[factor] === "1"))
        );
      });
      renderCrashes(filtered, crashLayers);
    });
    modeDropdown.addEventListener("change", (e) => {
      modeFilter = e.target.value;
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        return (
          (!mannerFilter || row.MannerofCollisionCode === mannerFilter) &&
          (!modeFilter ||
            modeMapping[modeFilter].some((factor) => row[factor] === "1"))
        );
      });
      renderCrashes(filtered, crashLayers);
    });

    // ------------------------------
    // Intersection Layers and MEPDO Legend Graphic
    // ------------------------------

    const [signalizedData, unsignalizedData] = await Promise.all([
      d3.json("data/signalized-intersection.geojson"),
      d3.json("data/unsignalized-intersection.geojson"),
    ]);

    const combinedIntersectionFeatures = signalizedData.features.concat(
      unsignalizedData.features
    );
    const intersectionMEPDOValues = combinedIntersectionFeatures
      .map((f) => +f.properties.MEPDO)
      .filter((v) => !isNaN(v));
    const minIntersectionMEPDO = Math.min(...intersectionMEPDOValues);
    const maxIntersectionMEPDO = Math.max(...intersectionMEPDOValues);

    // Helper to calculate radius for intersections (adjust scaleFactor to increase sizes)
    function calcRadiusMEPDO(val) {
      const radius = Math.sqrt(val / Math.PI);
      const scaleFactor = 2.5; // Increase overall sizes
      return radius * 0.5 * scaleFactor;
    }

    function createIntersectionLayer(data, fillColor, strokeColor) {
      return L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
          const mepdo = +feature.properties.MEPDO;
          const radius = calcRadiusMEPDO(mepdo);
          const marker = L.circleMarker(latlng, {
            radius: radius,
            fillColor: fillColor,
            color: strokeColor,
            weight: 1,
            fillOpacity: 0.8,
          });

          // Use SignalRank if defined; otherwise, check for UnsignalRank.
          const rankText =
            feature.properties.SignalRank != null
              ? `<u>Signalized Rank:</u> ${feature.properties.SignalRank}<br>`
              : feature.properties.UnsignalRank != null
              ? `<u>Unsignalized Rank:</u> ${feature.properties.UnsignalRank}<br>`
              : "";

          // Get CrashTotal and KA values.
          const crashTotal = feature.properties.CrashTotal;
          const ka = feature.properties.KA;

          // Build the intersection text.
          const mainRt = feature.properties.MAINRT_NAME || "N/A";
          const secondRt = feature.properties.SECONDRT_NAME || "N/A";
          const intersectionText = `<u>Intersection of ${mainRt} and ${secondRt}</u><br>`;

          // Build popup content.
          const popupContent = `
            <h2>${rankText}</h2>
            ${intersectionText}
            <u>MEPDO Score</u>: ${mepdo.toLocaleString()}<br>
            <u>Total Crashes</u>: ${crashTotal}<br>
            <u>KA Crashes</u>: ${ka}<br>
            
          `;

          // Bind popup and add hover effects.
          marker.bindPopup(popupContent);
          marker.on("mouseover", function () {
            this.setStyle({ color: "#00ffff", weight: 2 });
          });
          marker.on("mouseout", function () {
            this.setStyle({ color: strokeColor, weight: 1 });
          });
          return marker;
        },
      })
    }

    const signalizedLayer = createIntersectionLayer(
      signalizedData,
      "#FFAA00",
      "#AA5500"
    );
    const unsignalizedLayer = createIntersectionLayer(
      unsignalizedData,
      "#00AAFF",
      "#0055AA"
    );

    // Add toggleable legend entries for intersections with basic symbol
    const signalizedIntLabel = `<span class="legend-text" style="color:#AA5500; display:inline-block;">
         <span style="display:inline-block; width:12px; height:12px; background-color:#FFAA00; border:1px solid #AA5500; border-radius:50%; margin-right:5px;"></span>
         Signalized Intersections
      </span>`;
    layersLabels[signalizedIntLabel] = signalizedLayer;
    const unsignalizedIntLabel = `<span class="legend-text" style="color:#0055AA; display:inline-block;">
         <span style="display:inline-block; width:12px; height:12px; background-color:#00AAFF; border:1px solid #0055AA; border-radius:50%; margin-right:5px;"></span>
         Unsignalized Intersections
      </span>`;
    layersLabels[unsignalizedIntLabel] = unsignalizedLayer;

    // Build a separate, non-interactive legend graphic for the MEPDO Score Range.
    // Increase the range sizes by rounding max value to nearest thousand if desired.
    const maxValueRounded = Math.round(maxIntersectionMEPDO / 1000) * 1000;
    const largeDiameter = calcRadiusMEPDO(maxValueRounded) * 2;
    const smallDiameter = largeDiameter / 2;

    // Convert numeric values to pixel strings.
    const largeDiameterStr = largeDiameter.toFixed() + "px";
    const smallDiameterStr = smallDiameter.toFixed() + "px";

    // Build the graphic with nested circles and line leaders.
    const mepdoGraphic = `
    <div style="position: relative; width:${largeDiameterStr}; height:${largeDiameterStr};">
        <!-- Large circle -->
        <div style="position: absolute; top: 0; left: 0; width:${largeDiameterStr}; height:${largeDiameterStr};
                    border-radius: 50%; background-color:#ddd; border: 1px solid #888;"></div>
        <!-- Leader line for large circle -->
        <div style="position: absolute; top: 0; left: 50%; width: 35px; height: 1px; background: #888;"></div>
        <!-- Label for large circle -->
        <div style="position: absolute; top: -10px; left: calc(50% + 40px); font-size: 12px; margin: 5px;">
          ${maxIntersectionMEPDO.toLocaleString()}
        </div>
        
        <!-- Small circle -->
        <div style="position: absolute; top: calc(100% - ${smallDiameterStr}); 
                    left: calc(50% - ${(smallDiameter / 2).toFixed()}px); 
                    width:${smallDiameterStr}; height:${smallDiameterStr};
                    border-radius: 50%; background-color:#ddd; border: 1px solid #888;"></div>
        <!-- Leader line for small circle -->
        <div style="position: absolute; top: calc(100% - ${smallDiameterStr}); left: 50%; 
                    width: 35px; height: 1px; background: #888;"></div>
        <!-- Label for small circle -->
        <div style="position: absolute; top: calc(100% - ${smallDiameterStr} - 10px); left: calc(50% + 40px); font-size: 12px; margin: 5px;">
          ${minIntersectionMEPDO.toLocaleString()}
        </div>
      </div>
    `;
    const mepdoLegendLabel = `
      <div class="legend-text" style="margin: 5px; pointer-events: none;">
        <div>MEPDO Score Range:</div>
        <div style="margin-top: 10px;">
          ${mepdoGraphic}
        </div>
      </div>
    `;
    layersLabels[mepdoLegendLabel] = null; // Non-toggleable

    // ------------------------------
    // Legend Injection & Toggle Setup
    // ------------------------------
    const legendDiv = document.getElementById("legend");
    const legendKeys = Object.keys(layersLabels);
    let legendHTML = `<div class="legend-items" style="text-align: left;">`;
    legendKeys.forEach((key, i) => {
      if (layersLabels[key]) {
        legendHTML += `<div class="legend-item" data-index="${i}" style="margin: 5px 0; cursor: pointer;">
                          ${key}
                        </div>`;
      } else {
        legendHTML += `<div class="legend-item" style="margin: 5px 0;">
                          ${key}
                        </div>`;
      }
    });
    legendHTML += `</div>`;
    legendDiv.innerHTML = legendHTML;

    // Add toggle functionality for legend items that represent layers
    const legendItems = legendDiv.querySelectorAll(".legend-item[data-index]");
    legendItems.forEach((item) => {
      // Instead of setting opacity to 1 by default, check if the layer is on the map.
      const index = item.getAttribute("data-index");
      const key = legendKeys[index];
      const layer = layersLabels[key];
      if (!map.hasLayer(layer)) {
        item.style.opacity = "0.4";
      } else {
        item.style.opacity = "1";
      }
      item.addEventListener("click", function () {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
          item.style.opacity = "0.4";
        } else {
          map.addLayer(layer);
          item.style.opacity = "1";
        }
      });
    });

    hideSpinner();
  }

  fetchData();
})();
