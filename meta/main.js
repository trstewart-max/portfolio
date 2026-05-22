import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

async function loadData() {
  return await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];

      const ret = {
        id: commit,
        url: "https://github.com/trstewart-max/portfolio/commit/" + commit,
        author: first.author,
        date: first.date,
        time: first.time,
        timezone: first.timezone,
        datetime: first.datetime,
        hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        enumerable: false,
      });

      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
  const stats = d3.select("#stats");
  stats.selectAll("*").remove();

  const dl = stats.append("dl").attr("class", "stats");

  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  dl.append("dt").text("Files");
  dl.append("dd").text(d3.group(data, (d) => d.file).size);

  dl.append("dt").text("Max depth");
  dl.append("dd").text(d3.max(data, (d) => d.depth));

  dl.append("dt").text("Longest line");
  dl.append("dd").text(d3.max(data, (d) => d.length));

  dl.append("dt").text("Max lines");
  dl.append("dd").text(d3.max(commits, (d) => d.totalLines));
}

function renderTooltipContent(commit) {
  document.getElementById("commit-link").href = commit.url;
  document.getElementById("commit-link").textContent = commit.id;
  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleString("en", { dateStyle: "full" });
  document.getElementById("commit-author").textContent = commit.author;
  document.getElementById("commit-time-tooltip").textContent =
    commit.datetime.toLocaleTimeString();
  document.getElementById("commit-lines").textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById("commit-tooltip").hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

let xScale;
let yScale;

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  const dots = svg.append("g").attr("class", "dots");

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const rScale = d3
    .scaleSqrt()
    .domain(d3.extent(commits, (d) => d.totalLines))
    .range([2, 30]);

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", updateTooltipPosition)
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });

  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00")
    );
}

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");

  xScale.domain(d3.extent(commits, (d) => d.datetime));

  svg.select(".x-axis").call(d3.axisBottom(xScale));

  const rScale = d3
    .scaleSqrt()
    .domain(d3.extent(commits, (d) => d.totalLines))
    .range([2, 30]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  svg
    .select(".dots")
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7);
}

const fileColors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt");
        div.append("dd");
      })
    );

  filesContainer
    .select("dt")
    .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  filesContainer
    .select("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", (d) => `--color: ${fileColors(d.type)}`);
}

function renderItems(commits) {
  d3.select("#scatter-story")
    .selectAll("div")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html(
      (d, i) => `
        <p>
          Commit ${i + 1}<br>
          <strong>${d.datetime.toLocaleString("en", {
            dateStyle: "full",
            timeStyle: "short",
          })}</strong><br>
          ${d.totalLines} lines changed
        </p>
      `
    );
}

const data = await loadData();
const commits = processCommits(data);

let filteredCommits = commits;

const timeScale = d3
  .scaleTime()
  .domain([d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)])
  .range([0, 100]);

renderCommitInfo(data, filteredCommits);
updateFileDisplay(filteredCommits);
renderScatterPlot(data, filteredCommits);
renderItems(filteredCommits);

function onTimeSliderChange() {
  const commitProgress = Number(document.getElementById("commit-progress").value);
  const commitMaxTime = timeScale.invert(commitProgress);

  document.getElementById("commit-time").textContent =
    commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  updateScatterPlot(data, filteredCommits);
  renderItems(filteredCommits);
}

document
  .getElementById("commit-progress")
  .addEventListener("input", onTimeSliderChange);

onTimeSliderChange();

const scroller = scrollama();

function onStepEnter(response) {
  const commit = response.element.__data__;
  const commitMaxTime = commit.datetime;

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  updateScatterPlot(data, filteredCommits);
}

scroller
  .setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
  })
  .onStepEnter(onStepEnter);