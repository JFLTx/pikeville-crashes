(function () {
  // Define layer properties
  const layerProps = [
    {
      id: "K",
      text: "Fatal Crash (K)",
      color: "#42050a",
      size: 12,
      checked: true,
    },
    {
      id: "A",
      text: "Serious Injury Crash (A)",
      color: "#831720",
      size: 10,
      checked: true,
    },
    {
      id: "B",
      text: "Minor Injury Crash (B)",
      color: "#b03a42",
      size: 7.5,
      checked: true,
    },
    {
      id: "C",
      text: "Possible Injury Crash (C)",
      color: "#d5696f",
      size: 6,
      checked: true,
    },
    {
      id: "O",
      text: "Property Damage Only (O)",
      color: "#f4b4b9",
      size: 4,
      checked: true,
    },
  ];

  // Define Manner of Collision Mapping
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

  // Define Mode Mapping
  const modeMapping = {
    Bicyclists: ["Bicyclists"],
    Pedestrians: ["Pedestrians"],
    Motorcyclists: ["Motorcyclists"],
    "Motor Vehicles": [
      "YoungDriver",
      "CommercialVehicle",
      "MatureDriver",
      "Distracted",
      "Aggressive",
      "Impaired",
      "Unrestrained",
      "RoadwayDeparture",
      "MedXover",
    ],
  };

  // HTML page settings
  const spinner = document.querySelector(".spinner-container");

  // Populate the dropdown menu
  const dropdown = document.getElementById("collision-filter");
  Object.entries(mannerOfCollisionMapping).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key; // Use the numeric MannerofCollisionCode as the value
    option.textContent = value; // Use the description as the text
    dropdown.appendChild(option);
  });

  // Populate Mode dropdown (Initially hidden)
  const modeDropdown = document.getElementById("mode-filter");

  // Map options
  const options = {
    zoomSnap: 0.1,
    center: [37.4769, -82.5242],
    zoom: 12,
  };

  // Create the Leaflet map
  const map = L.map("map", options);

  // create Leaflet panes for ordering map layers
  setPanes = ["bottom", "middle", "top"];
  setPanes.forEach((pane, i) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 401 + i;
  });

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Imagery &copy; Esri",
    }
  ).addTo(map);

  // labels for map
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Developed by Palmer Engineering',
      pane: "top",
    }
  ).addTo(map);

  // Function to show the spinner
  function showSpinner() {
    spinner.style.display = "flex"; // Show the spinner
  }

  // Function to hide the spinner
  function hideSpinner() {
    spinner.style.display = "none"; // Hide the spinner
  }

  // Helper function to render crashes
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

      // Filter by Manner of Collision
      if (mannerFilter && row.MannerofCollisionCode !== mannerFilter) return;

      // Filter by Mode (if provided)
      if (
        modeFilter &&
        !modeMapping[modeFilter].some((factor) => row[factor] === "1")
      )
        return;

      // Collect factors with a value of 1
      const factorsToCheck = [
        "Motorcyclists",
        "Commercial Vehicle",
        "Young Driver",
        "Mature Driver",
        "Pedestrians",
        "Bicyclists",
        "Distracted",
        "Aggressive",
        "Impaired",
        "Unrestrained",
        "Roadway Departure",
        "Median Cross-over",
      ];

      const factors = factorsToCheck.filter((factor) => row[factor] === "1");

      const popupContent = `
          <u>MasterFile</u>: ${row.MasterFile}<br>
          <u>KABCO</u>: ${layerProp.text}<br>
          <u>Manner of Collision</u>: ${
            mannerOfCollisionMapping[row.MannerofCollisionCode]
          }<br>
          <u>Factors</u>: ${factors.length > 0 ? factors.join(", ") : "None"}
        `;

      const marker = L.circleMarker([lat, lng], {
        radius: layerProp.size,
        fillColor: layerProp.color,
        color: "#444",
        weight: 0.5,
        opacity: 1,
        fillOpacity: 1,
        zIndex: 2000,
      });

      marker.bindPopup(popupContent);

      marker.on("mouseover", function () {
        this.setStyle({
          color: "#00ffff",
          weight: 2,
        });
      });

      marker.on("mouseout", function () {
        this.setStyle({
          color: "#444",
          weight: 0.5,
        });
      });

      crashLayers[kabco].addLayer(marker);
    });
  }

  // Load the data asynchronously
  async function fetchData() {
    showSpinner();

    // Load the data
    const data = await d3.csv("data/PikeCountyCrashData_JFLT.csv");
    const cityLimits = await d3.json("data/pikeville-study-area.geojson");
    const pikeCo = await d3.json("data/pike-county.geojson");

    // filter out parking lot crashes
    const filteredData = data.filter((row) => row.ParkingLotIndicator !== "Y");

    // Initialize crashLayers and layersLabels before using them
    const crashLayers = {};
    const layersLabels = {};

    const city = L.geoJSON(cityLimits, {
      style: function (feature) {
        return {
          color: "#ff0",
          weight: 4,
          fillOpacity: 0,
        };
      },
    }).addTo(map);

    // fit the bounds to the city limit
    map.fitBounds(city.getBounds());

    const county = L.geoJSON(pikeCo, {
      style: function (feature) {
        return {
          color: "#888",
          weight: 4,
          fillOpacity: 0,
        };
      },
    }).addTo(map);

    // Initialize crashLayers and layersLabels with layerProps
    layerProps.forEach((prop) => {
      crashLayers[prop.id] = L.layerGroup().addTo(map);

      const maxSize = Math.max(...layerProps.map(p => p.size)); // find the max size for the layerProps (should be for Fatal Crash)
      const margin = (maxSize - prop.size); // calculate a dynamic margin for the circleSymbol

      // Create a circle for the legend
      const circleSymbol = `<span style="display: inline-block; width: ${
        prop.size * 2
      }px; height: ${prop.size * 2}px; background-color: ${
        prop.color
      }; border-radius: 50%; margin-left: ${margin}px; margin-right: ${margin + 5}px; vertical-align: middle; line-height: 0;"></span>`;

      // Create the label with the symbol and the text
      layersLabels[
        `<span class="legend-text" style="color: ${prop.color}; display: inline-block; line-height: 1.5;">${circleSymbol}${prop.text}</span>`
      ] = crashLayers[prop.id];
    });

    // Process the data
    filteredData.forEach((row) => {
      if (!["K", "A", "B", "C", "O"].includes(row.KABCO)) {
        row.KABCO = "O";
      }
      // Check MannerofCollisionCode and map or set to UNKNOWN
      if (
        !Object.keys(mannerOfCollisionMapping).includes(
          row.MannerofCollisionCode
        )
      ) {
        row.MannerofCollisionCode = "UNKNOWN";
      }
    });

    // Render all crashes on initial load
    renderCrashes(filteredData, crashLayers, null, null);

    // Add dropdown filtering
    dropdown.addEventListener("change", (e) => {
      const mannerFilter = e.target.value;
      renderCrashes(
        filteredData,
        crashLayers,
        mannerFilter,
        modeDropdown.value
      );
    });

    modeDropdown.addEventListener("change", (e) => {
      const modeFilter = e.target.value;
      renderCrashes(filteredData, crashLayers, dropdown.value, modeFilter);
    });

    // Add the legend control to the map
    const legendControl = L.control.layers(null, layersLabels, {
      collapsed: false, // Ensure legend starts expanded on larger screens
    });

    // Add the legend to the map
    legendControl.addTo(map);

    // Dynamically manage legend visibility based on screen size
    function legendDisplay() {
      const legendContainer = document.querySelector(".leaflet-control-layers");
      const legendContent = legendContainer.querySelector(
        ".leaflet-control-layers-list"
      );

      // Check if the toggle button already exists
      let toggleButton = legendContainer.querySelector(".toggle-legend-btn");

      if (window.innerWidth <= 768) {
        legendContent.style.display = "none";

        // If the button doesn't already exist, create it
        if (!toggleButton) {
          toggleButton = document.createElement("button");
          toggleButton.className =
            "btn btn-primary float-end toggle-legend-btn";
          toggleButton.textContent = "Show Legend";

          // Insert the button before the legend content
          legendContainer.insertBefore(toggleButton, legendContent);

          // Add toggle functionality for smaller screens
          toggleButton.addEventListener("click", () => {
            const isVisible = legendContent.style.display !== "none";
            legendContent.style.display = isVisible ? "none" : "block";
            toggleButton.textContent = isVisible
              ? "Show Legend"
              : "Hide Legend";
          });
        }
      } else {
        // For larger screens, always show the legend and remove the button if it exists
        legendContent.style.display = "block";
        if (toggleButton) {
          toggleButton.remove();
        }
      }
    }

    // Call the function on initial load
    legendDisplay();

    // Reapply on window resize to handle dynamic screen changes
    window.addEventListener("resize", () => {
      legendDisplay();
    });

    hideSpinner();
  }

  fetchData();
})();
