const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("open");
  hamburger.classList.toggle("active");
  document.body.classList.toggle("nav-open");
});
AOS.init({
  duration: 1000, // animation duration in ms
  once: true, // animate only once while scrolling
});