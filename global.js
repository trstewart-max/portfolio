console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "meta/", title: "Meta" },
  { url: "https://github.com/trstewart-max", title: "GitHub" }
];

export const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

// ======================
// NAVIGATION
// ======================
let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith("http") ? BASE_PATH + url : url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

// ======================
// THEME SWITCHER
// ======================
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

let select = document.querySelector(".color-scheme select");

if (localStorage.colorScheme) {
  document.documentElement.style.setProperty(
    "color-scheme",
    localStorage.colorScheme
  );
  select.value = localStorage.colorScheme;
}

select.addEventListener("input", function (event) {
  let value = event.target.value;
  document.documentElement.style.setProperty("color-scheme", value);
  localStorage.colorScheme = value;
});

// ======================
// CONTACT FORM
// ======================
let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let url = form.action + "?";
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  url += params.join("&");
  location.href = url;
});

// ======================
// FETCH JSON
// ======================
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}

// ======================
// RENDER PROJECTS
// ======================
export function renderProjects(projects, container, headingLevel = "h2") {
  container.innerHTML = "";

  projects.forEach((project) => {
    const article = document.createElement("article");

    article.innerHTML = `
      <${headingLevel}>
        ${
          project.url
            ? `<a href="${project.url}" target="_blank">${project.title}</a>`
            : project.title
        }
      </${headingLevel}>

      ${
        project.image
          ? `<img src="${BASE_PATH}${project.image}" alt="${project.title}">`
          : `<div class="image-placeholder">IMAGE COMING SOON</div>`
      }

      <div>
        <p>${project.description}</p>
        <p class="project-year">c. ${project.year}</p>
      </div>
    `;

    container.appendChild(article);
  });
}

// ======================
// GITHUB API
// ======================
export async function fetchGithubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}