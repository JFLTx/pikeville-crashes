(function () {
  // HTML page settings
  const spinner = document.querySelector(".spinner-container");
  const dropdown = document.getElementById("collision-filter");
  const modeDropdown = document.getElementById("mode-filter");
  const slider = document.getElementById("slider-controls");
  const sliderLabel = document.getElementById("slider-label");

  // buttons for hiding the slider and dropdown
  const toggleDropdown = document.getElementById("toggle-dropdown");
  const toggleSlider = document.getElementById("toggle-slider");

  // Function to update visibility and dynamic positioning based on screen size
  function updateVisibility() {
    const isSmallScreen = window.innerWidth <= 576;

    if (isSmallScreen) {
      // Small screen: Hide dropdown and slider by default, show toggle buttons
      dropdown.style.display = "none";
      modeDropdown.style.display = "none";
      slider.style.display = "none";
      toggleDropdown.style.display = "block";
      toggleSlider.style.display = "block";

      // Position the dropdown and slider dynamically
      dropdown.style.position = "absolute";
      dropdown.style.bottom = "60px";
      dropdown.style.left = "10px";
      dropdown.style.width = "150px";

      modeDropdown.style.position = "absolute";
      modeDropdown.style.bottom = "90px";
      modeDropdown.style.left = "10px";
      modeDropdown.style.width = "150px";

      slider.style.position = "absolute";
      slider.style.bottom = "85px";
      slider.style.right = "10px";
    } else {
      // Larger screens: Reset to default styles
      dropdown.style.display = "block";
      modeDropdown.style.display = "block";
      slider.style.display = "block";
      toggleDropdown.style.display = "none";
      toggleSlider.style.display = "none";

      // Reset dropdown and slider positioning
      dropdown.style.position = "";
      dropdown.style.bottom = "";
      dropdown.style.left = "";
      dropdown.style.width = "";

      modeDropdown.style.position = "";
      modeDropdown.style.bottom = "";
      modeDropdown.style.left = "";
      modeDropdown.style.width = "";

      slider.style.position = "";
      slider.style.bottom = "";
      slider.style.right = "";
    }
  }

  // Toggle dropdown visibility
  toggleDropdown.addEventListener("click", function (event) {
    event.stopPropagation(); // Prevent click from propagating to document
    const isHidden =
      dropdown.style.display === "none" &&
      modeDropdown.style.display === "none";
    dropdown.style.display = isHidden ? "block" : "none";
    modeDropdown.style.display = isHidden ? "block" : "none";
  });

  // Toggle slider visibility
  toggleSlider.addEventListener("click", function (event) {
    event.stopPropagation(); // Prevent click from propagating to document
    const isHidden = slider.style.display === "none";
    slider.style.display = isHidden ? "block" : "none";
  });

  // Hide dropdown and slider when clicking anywhere outside
  document.addEventListener("click", (event) => {
    // Only run the event if the screen size is 576px or below
    if (window.innerWidth <= 576) {
      const dropdownClick =
        dropdown.contains(event.target) || modeDropdown.contains(event.target);
      const sliderClick = slider.contains(event.target);
      const dropdownToggleClick = toggleDropdown.contains(event.target);
      const sliderToggleClick = toggleSlider.contains(event.target);

      // If the click is outside, hide the dropdown and slider
      if (!dropdownClick && !dropdownToggleClick) {
        dropdown.style.display = "none";
        modeDropdown.style.display = "none";
      }

      if (!sliderClick && !sliderToggleClick) {
        slider.style.display = "none";
      }
    }
  });

  // Call the visibility update on initial load
  updateVisibility();

  // Reapply on window resize to handle dynamic screen changes
  window.addEventListener("resize", updateVisibility);

  // Initialize global filter variables
  let mannerFilter = null;
  let modeFilter = null;
  let currentTimeRange = [0, 2359]; // Default to "All Crashes" range

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
    Bicyclists: ["Bicyclist"],
    Pedestrians: ["Pedestrian"],
    Motorcyclists: ["Motorcyclist"],
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

  // define time groups for the slider
  const timeGroups = [
    { label: "All Crashes", range: [0, 2359] }, // range for all crashes
    { label: "12:00 AM - 2:59 AM", range: [0, 259] },
    { label: "3:00 AM - 5:59 AM", range: [300, 559] },
    { label: "6:00 AM - 8:59 AM", range: [600, 859] },
    { label: "9:00 AM - 11:59 AM", range: [900, 1159] },
    { label: "12:00 PM - 2:59 PM", range: [1200, 1459] },
    { label: "3:00 PM - 5:59 PM", range: [1500, 1759] },
    { label: "6:00 PM - 8:59 PM", range: [1800, 2059] },
    { label: "9:00 PM - 11:59 PM", range: [2100, 2359] },
  ];

  // Populate the dropdown menu
  Object.entries(mannerOfCollisionMapping).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key; // Use the numeric MannerofCollisionCode as the value
    option.textContent = value; // Use the description as the text
    dropdown.appendChild(option);
  });

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
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PEC',
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

  function timeFilter(filteredData, timeRange) {
    if (timeRange) {
      return filteredData.filter((row) => {
        const crashTime = parseInt(row.CollisionTime, 10);
        return crashTime >= timeRange[0] && crashTime <= timeRange[1];
      });
    }
    return filteredData;
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
        pane: "top",
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
    const data = await d3.csv("data/pike-county-updated-crashes-JFLT.csv");
    const cityLimits = await d3.json("data/pikeville-study-area2.geojson");
    const pikeCo = await d3.json("data/pike-county.geojson");

    // filter out parking lot crashes
    const filteredData = data.filter((row) => row.ParkingLotIndicator !== "Y" && row.CityCrash == 1);

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
    map.fitBounds(city.getBounds(), {
      padding: [20, 20],
    });

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

      const maxSize = Math.max(...layerProps.map((p) => p.size)); // find the max size for the layerProps (should be for Fatal Crash)
      const margin = maxSize - prop.size; // calculate a dynamic margin for the circleSymbol

      // Create a circle for the legend
      const circleSymbol = `<span style="display: inline-block; width: ${
        prop.size * 2
      }px; height: ${prop.size * 2}px; background-color: ${
        prop.color
      }; border-radius: 50%; margin-left: ${margin}px; margin-right: ${
        margin + 5
      }px; vertical-align: middle; line-height: 0;"></span>`;

      // Create the label with the symbol and the text
      layersLabels[
        `<span class="legend-text" style="color: ${prop.color}; display: inline-block; line-height:">${circleSymbol}${prop.text}</span>`
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

    // event listener for the slider input
    slider.addEventListener("input", function (e) {
      const index = e.target.value;
      currentTimeRange = timeGroups[index].range;

      // update the label
      sliderLabel.textContent = timeGroups[index].label;

      // filter crashes based on the indexed time range
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        // Apply manner filter
        if (mannerFilter && row.MannerofCollisionCode !== mannerFilter)
          return false;

        // Apply mode filter
        if (
          modeFilter &&
          !modeMapping[modeFilter].some((factor) => row[factor] === "1")
        )
          return false;

        return true; // Passes all filters
      });

      renderCrashes(filtered, crashLayers);
    });

    // Add dropdown filtering
    dropdown.addEventListener("change", (e) => {
      mannerFilter = e.target.value;
      // Reapply all filters when manner filter changes
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

    // Mode dropdown change event
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
