import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../lib/projects.json');

let query = "";
let searchInput = document.querySelector(".searchBar");

const title = document.querySelector(".projects-title");
title.textContent = `${projects.length} Projects`;

const projectsContainer = document.querySelector(".projects");

let colors = d3.scaleOrdinal(d3.schemeTableau10);
let selectedIndex = -1;

function getFilteredProjects() {
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join("\n").toLowerCase();
    return values.includes(query.toLowerCase());
  });

  return filteredProjects;
}

function updateDisplay() {
  let filteredProjects = getFilteredProjects();

  if (selectedIndex !== -1) {
    let rolledData = d3.rollups(
      filteredProjects,
      (v) => v.length,
      (d) => d.year
    );

    let data = rolledData.map(([year, count]) => {
      return { value: count, label: year };
    });

    let selectedYear = data[selectedIndex]?.label;

    if (selectedYear) {
      filteredProjects = filteredProjects.filter(
        (project) => project.year === selectedYear
      );
    }
  }

  renderProjects(filteredProjects, projectsContainer, "h2");
  renderPieChart(getFilteredProjects());
}

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let sliceGenerator = d3.pie().value((d) => d.value);

  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  if (selectedIndex >= data.length) {
    selectedIndex = -1;
  }

  let svg = d3.select("#projects-pie-plot");
  svg.selectAll("path").remove();

  let legend = d3.select(".legend");
  legend.selectAll("li").remove();

  arcs.forEach((arc, idx) => {
    svg
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(idx))
      .attr("class", idx === selectedIndex ? "selected" : "")
      .on("click", () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        updateDisplay();
      });
  });

  data.forEach((d, idx) => {
    legend
      .append("li")
      .attr("style", `--color:${colors(idx)}`)
      .attr("class", idx === selectedIndex ? "legend-item selected" : "legend-item")
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

updateDisplay();

searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  selectedIndex = -1;
  updateDisplay();
});