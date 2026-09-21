/* Cargill Academy — portal app. Vanilla JS, no dependencies, no build step.
   Course content lives in curriculum.json. Progress lives in localStorage,
   keyed by learner name, and can be exported / imported as JSON. */
(function () {
  "use strict";

  var STORE_KEY = "cargill-academy-v1";
  var DEFAULT_LEARNERS = ["Cooper", "Myles"];
  var CERT_STATUSES = ["Not started", "Studying", "Scheduled", "Passed"];

  var data = null;     // curriculum.json
  var state = null;    // persisted progress
  var index = null;    // lookup tables built from `data`

  /* ------------------------------------------------------------------ store */

  function blankLearner() {
    return { lessons: {}, certs: {}, milestones: {}, streak: { count: 0, last: null, days: [] } };
  }

  function loadState() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { s = null; }
    if (!s || typeof s !== "object" || !s.learners) {
      s = { version: 1, current: DEFAULT_LEARNERS[0], learners: {} };
    }
    DEFAULT_LEARNERS.forEach(function (n) { if (!s.learners[n]) s.learners[n] = blankLearner(); });
    if (!s.learners[s.current]) s.current = Object.keys(s.learners)[0];
    Object.keys(s.learners).forEach(function (n) {
      var l = s.learners[n], b = blankLearner();
      Object.keys(b).forEach(function (k) { if (!l[k]) l[k] = b[k]; });
      if (!Array.isArray(l.streak.days)) l.streak.days = [];
    });
    return s;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("Cargill Academy: could not save progress —", e); }
  }

  function me() { return state.learners[state.current]; }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function daysBetween(a, b) {
    return Math.round((Date.parse(b + "T00:00:00") - Date.parse(a + "T00:00:00")) / 86400000);
  }

  /* Record activity for the streak counter. Called whenever a lesson is
     completed or a quiz is answered. */
  function touchStreak() {
    var st = me().streak, t = today();
    if (st.last === t) return;
    if (st.last && daysBetween(st.last, t) === 1) st.count += 1;
    else st.count = 1;
    st.last = t;
    if (st.days.indexOf(t) === -1) st.days.push(t);
    if (st.days.length > 400) st.days = st.days.slice(-400);
  }

  /* --------------------------------------------------------------- indexing */

  function buildIndex() {
    var courses = {}, lessons = {}, order = [];
    data.courses.forEach(function (c) {
      courses[c.id] = c;
      c.sections.forEach(function (s) {
        s.lessons.forEach(function (l) {
          lessons[l.id] = { lesson: l, section: s, course: c };
          order.push({ courseId: c.id, lessonId: l.id });
        });
      });
    });
    var phases = {};
    data.phases.forEach(function (p) { phases[p.id] = p; });
    var lanes = {};
    (data.lanes || []).forEach(function (l) { lanes[l.id] = l; });
    return { courses: courses, lessons: lessons, order: order, phases: phases, lanes: lanes };
  }

  function courseLessons(course) {
    var out = [];
    course.sections.forEach(function (s) { s.lessons.forEach(function (l) { out.push(l); }); });
    return out;
  }

  function lessonState(lessonId) { return me().lessons[lessonId] || null; }
  function isDone(lessonId) { var p = lessonState(lessonId); return !!(p && p.done); }

  function courseProgress(course) {
    var all = courseLessons(course);
    var done = all.filter(function (l) { return isDone(l.id); }).length;
    return { done: done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  function isEnrolled(course) {
    return courseLessons(course).some(function (l) { return !!lessonState(l.id); });
  }

  function nextLessonIn(course) {
    var all = courseLessons(course);
    for (var i = 0; i < all.length; i++) { if (!isDone(all[i].id)) return all[i]; }
    return null;
  }

  function overallProgress() {
    var done = 0, total = 0;
    data.courses.forEach(function (c) {
      var p = courseProgress(c); done += p.done; total += p.total;
    });
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  /* ----------------------------------------------------------------- helpers */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function ring(pct, size) {
    size = size || 52;
    var r = (size - 7) / 2, circ = 2 * Math.PI * r, on = (pct / 100) * circ;
    return '<div class="ring' + (pct === 100 ? " done" : "") + '" role="img" aria-label="' + pct + '% complete">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="5"></circle>' +
      '<circle class="fill" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="5" ' +
      'stroke-dasharray="' + on.toFixed(1) + ' ' + circ.toFixed(1) + '"></circle>' +
      "</svg><span class=\"pct\">" + pct + "%</span></div>";
  }

  function laneBadge(laneId) {
    var name = (index.lanes[laneId] && index.lanes[laneId].name) || laneId || "All lanes";
    return '<span class="badge lane-' + esc(laneId || "all") + '">' + esc(name) + "</span>";
  }

  function certName(certId) {
    var c = (data.certifications || []).filter(function (x) { return x.id === certId; })[0];
    return c ? c.name : null;
  }

  /* ------------------------------------------------------------------ router */

  function parseHash() {
    var h = (location.hash || "#/catalog").replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    return { view: parts[0] || "catalog", a: parts[1] || null, b: parts[2] || null };
  }

  function render() {
    var app = document.getElementById("app");
    var r = parseHash();
    app.innerHTML = "";
    if (r.view === "course" && index.courses[r.a]) viewCourse(app, index.courses[r.a], r.b);
    else if (r.view === "learning") viewLearning(app);
    else if (r.view === "certs") viewCerts(app);
    else viewCatalog(app);

    document.querySelectorAll('nav.main a[data-route]').forEach(function (a) {
      var active = a.getAttribute("data-route") === r.view ||
        (r.view === "course" && a.getAttribute("data-route") === "catalog");
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  /* ----------------------------------------------------------------- catalog */

  function courseCard(c) {
    var p = courseProgress(c);
    var cert = c.certification ? certName(c.certification) : null;
    return '<a class="course-card" href="#/course/' + esc(c.id) + '">' +
      '<div class="top"><div>' + laneBadge(c.lane) +
      "<h3>" + esc(c.title) + "</h3></div>" + ring(p.pct) + "</div>" +
      '<p class="sum">' + esc(c.summary) + "</p>" +
      '<div class="facts">' +
      "<span>" + c.estHours + " hrs</span>" +
      "<span>" + p.total + " lessons</span>" +
      (cert ? '<span class="cert">' + esc(cert) + "</span>" : "<span>no exam</span>") +
      "<span>" + p.done + "/" + p.total + " done</span>" +
      "</div></a>";
  }

  function viewCatalog(app) {
    var over = overallProgress();
    app.appendChild(el(
      '<div class="page-head">' +
      '<div class="eyebrow">Cargill Consulting · Training</div>' +
      "<h1>Cargill Academy</h1>" +
      '<p class="lede">Five years of IT and cybersecurity, laid out as courses you can actually finish. ' +
      "Pick a phase, work the labs, mark the lessons. " + esc(state.current) + " is " + over.pct +
      "% through " + over.total + " lessons.</p></div>"
    ));

    data.phases.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (ph) {
      var inPhase = data.courses.filter(function (c) { return c.phase === ph.id; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      if (!inPhase.length) return;
      var hours = inPhase.reduce(function (n, c) { return n + (c.estHours || 0); }, 0);
      var block = el('<section class="phase-block"></section>');
      block.appendChild(el(
        '<div class="phase-head"><h2>' + esc(ph.name) + "</h2>" +
        '<span class="when">' + esc(ph.timeframe || "") + "</span>" +
        '<span class="count">' + inPhase.length + " courses · ~" + hours + " hrs</span></div>"
      ));
      var grid = el('<div class="course-grid"></div>');
      inPhase.forEach(function (c) { grid.appendChild(el(courseCard(c))); });
      block.appendChild(grid);
      app.appendChild(block);
    });
  }

  /* ------------------------------------------------------------------ course */

  function viewCourse(app, course, lessonId) {
    var all = courseLessons(course);
    if (!lessonId || !index.lessons[lessonId] || index.lessons[lessonId].course.id !== course.id) {
      var nxt = nextLessonIn(course) || all[0];
      lessonId = nxt ? nxt.id : null;
    }
    var layout = el('<div class="course-layout"></div>');
    layout.appendChild(buildSidebar(course, lessonId));
    layout.appendChild(lessonId ? buildLessonPane(course, index.lessons[lessonId].lesson)
      : el('<div class="lesson-pane"><p>This course has no lessons yet.</p></div>'));
    app.appendChild(layout);
  }

  function buildSidebar(course, currentId) {
    var p = courseProgress(course);
    var cert = course.certification ? certName(course.certification) : null;
    var side = el('<aside class="course-side"></aside>');
    side.appendChild(el(
      '<div class="side-head"><a href="#/catalog" style="font-size:.85rem;text-decoration:none">← All courses</a>' +
      "<h2>" + esc(course.title) + "</h2>" +
      '<div class="facts">' + esc((index.phases[course.phase] || {}).name || "") + " · " + course.estHours + " hrs" +
      (cert ? " · " + esc(cert) : "") + "</div>" +
      '<div class="bar-track"><div class="bar-fill" style="width:' + p.pct + '%"></div></div>' +
      '<div class="bar-label">' + p.done + " of " + p.total + " lessons · " + p.pct + "%</div></div>"
    ));

    course.sections.forEach(function (s) {
      var hasCurrent = s.lessons.some(function (l) { return l.id === currentId; });
      var doneHere = s.lessons.filter(function (l) { return isDone(l.id); }).length;
      var d = el('<details class="section"' + (hasCurrent ? " open" : "") + "></details>");
      d.appendChild(el('<summary><span class="s-title">' + esc(s.title) + "</span>" +
        '<span class="s-count">' + doneHere + "/" + s.lessons.length + "</span></summary>"));
      var ul = el('<ul class="lesson-list"></ul>');
      s.lessons.forEach(function (l) {
        var done = isDone(l.id);
        var li = el('<li class="' + (done ? "done " : "") + (l.id === currentId ? "current" : "") + '">' +
          '<input type="checkbox" ' + (done ? "checked" : "") + ' aria-label="Mark ' + esc(l.title) + ' complete">' +
          '<a href="#/course/' + esc(course.id) + "/" + esc(l.id) + '">' + esc(l.title) + "</a></li>");
        li.querySelector("input").addEventListener("change", function (ev) {
          setDone(l.id, ev.target.checked);
          render();
        });
        ul.appendChild(li);
      });
      d.appendChild(ul);
      side.appendChild(d);
    });
    return side;
  }

  function setDone(lessonId, done) {
    var l = me().lessons[lessonId] || (me().lessons[lessonId] = {});
    l.done = !!done;
    if (done) { l.completedAt = today(); touchStreak(); }
    save();
  }

  function buildLessonPane(course, lesson) {
    var meta = index.lessons[lesson.id];
    var all = courseLessons(course);
    var i = all.findIndex(function (l) { return l.id === lesson.id; });
    var prev = i > 0 ? all[i - 1] : null;
    var next = i < all.length - 1 ? all[i + 1] : null;
    var st = lessonState(lesson.id) || {};

    var pane = el('<article class="lesson-pane"></article>');
    pane.appendChild(el(
      '<div class="crumb">' + esc(course.title) + " · " + esc(meta.section.title) +
      " · Lesson " + (i + 1) + " of " + all.length + "</div><h1>" + esc(lesson.title) + "</h1>"
    ));

    pane.appendChild(el('<div class="block objective"><h2>Objective</h2><p>' + esc(lesson.objective) + "</p></div>"));

    if (lesson.resources && lesson.resources.length) {
      pane.appendChild(el('<div class="block resources"><h2>Read / watch</h2><ul>' +
        lesson.resources.map(function (r) {
          return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.label) + "</a></li>";
        }).join("") + "</ul></div>"));
    }

    pane.appendChild(el('<div class="block lab"><h2>Hands-on lab</h2><div class="lab-body">' +
      esc(lesson.lab) + "</div></div>"));

    if (lesson.quiz && lesson.quiz.length) pane.appendChild(buildQuiz(lesson, st));

    var foot = el('<div class="lesson-foot"></div>');
    foot.appendChild(el(prev
      ? '<a class="btn small ghost" href="#/course/' + esc(course.id) + "/" + esc(prev.id) + '">← Previous</a>'
      : '<span></span>'));
    foot.appendChild(el('<span class="spacer"></span>'));
    if (st.done) foot.appendChild(el('<span class="done-flag">✓ Completed</span>'));
    var markBtn = el('<button class="btn primary small" type="button">' +
      (st.done ? (next ? "Next lesson →" : "Finish course") : "Mark complete" + (next ? " &amp; continue →" : "")) + "</button>");
    markBtn.addEventListener("click", function () {
      if (!st.done) setDone(lesson.id, true);
      if (next) location.hash = "#/course/" + course.id + "/" + next.id;
      else location.hash = "#/learning";
      render();
    });
    foot.appendChild(markBtn);
    pane.appendChild(foot);
    return pane;
  }

  function buildQuiz(lesson, st) {
    var saved = st.quiz || {};
    var wrap = el('<div class="block quiz"><h2>Self-check</h2></div>');
    var scoreLine = el('<p class="quiz-score"></p>');
    wrap.appendChild(scoreLine);

    function paintScore() {
      var answered = Object.keys(saved).length;
      var right = Object.keys(saved).filter(function (k) { return saved[k] === lesson.quiz[k].answer; }).length;
      scoreLine.innerHTML = answered
        ? "Score: <b>" + right + " / " + lesson.quiz.length + "</b> (" + answered + " answered)"
        : "Answer all " + lesson.quiz.length + " questions — you get the explanation either way.";
    }

    lesson.quiz.forEach(function (q, qi) {
      var item = el('<div class="quiz-item"><p class="q">' + (qi + 1) + ". " + esc(q.q) + "</p></div>");
      var picked = saved[qi];
      q.choices.forEach(function (choice, ci) {
        var cls = "choice";
        if (picked != null) {
          if (ci === q.answer) cls += " correct";
          else if (ci === picked) cls += " wrong";
        }
        var lab = el('<label class="' + cls + '"><input type="radio" name="q-' + esc(lesson.id) + "-" + qi + '" value="' + ci + '"' +
          (picked === ci ? " checked" : "") + (picked != null ? " disabled" : "") + ">" + esc(choice) + "</label>");
        lab.querySelector("input").addEventListener("change", function () {
          var rec = me().lessons[lesson.id] || (me().lessons[lesson.id] = {});
          rec.quiz = rec.quiz || {};
          rec.quiz[qi] = ci;
          saved = rec.quiz;
          rec.quizScore = Object.keys(rec.quiz).filter(function (k) { return rec.quiz[k] === lesson.quiz[k].answer; }).length;
          rec.quizTotal = lesson.quiz.length;
          touchStreak();
          save();
          // repaint this question in place
          item.querySelectorAll("label.choice").forEach(function (l2, li) {
            l2.querySelector("input").disabled = true;
            l2.classList.remove("correct", "wrong");
            if (li === q.answer) l2.classList.add("correct");
            else if (li === ci) l2.classList.add("wrong");
          });
          if (!item.querySelector(".explain")) {
            item.appendChild(el('<p class="explain">' + (ci === q.answer ? "✓ " : "✗ ") + esc(q.explain || "") + "</p>"));
          }
          paintScore();
        });
        item.appendChild(lab);
      });
      if (picked != null && q.explain) {
        item.appendChild(el('<p class="explain">' + (picked === q.answer ? "✓ " : "✗ ") + esc(q.explain) + "</p>"));
      }
      wrap.appendChild(item);
    });

    var reset = el('<button class="mini" type="button">Retake this quiz</button>');
    reset.addEventListener("click", function () {
      var rec = me().lessons[lesson.id];
      if (rec) { delete rec.quiz; delete rec.quizScore; delete rec.quizTotal; save(); }
      render();
    });
    wrap.appendChild(reset);
    paintScore();
    return wrap;
  }

  /* ------------------------------------------------------------- my learning */

  function viewLearning(app) {
    var over = overallProgress();
    var enrolled = data.courses.filter(isEnrolled);
    var passed = Object.keys(me().certs).filter(function (k) { return me().certs[k].status === "Passed"; }).length;

    app.appendChild(el('<div class="page-head"><div class="eyebrow">Progress</div>' +
      "<h1>" + esc(state.current) + "’s learning</h1>" +
      '<p class="lede">Everything below is stored in this browser for ' + esc(state.current) +
      ". Use Export before switching devices.</p></div>"));

    app.appendChild(el('<div class="stat-grid">' +
      '<div class="stat"><div class="n">' + over.pct + '%</div><div class="l">Overall completion</div></div>' +
      '<div class="stat"><div class="n">' + over.done + '</div><div class="l">Lessons completed of ' + over.total + '</div></div>' +
      '<div class="stat"><div class="n">' + (me().streak.count || 0) + '</div><div class="l">Day streak' +
      (me().streak.last ? " · last active " + esc(me().streak.last) : "") + '</div></div>' +
      '<div class="stat"><div class="n">' + passed + '</div><div class="l">Certifications passed</div></div>' +
      "</div>"));

    // next up
    var nextCourse = enrolled.filter(function (c) { return courseProgress(c).pct < 100; })[0] ||
      data.courses.filter(function (c) { return courseProgress(c).pct < 100; })[0];
    if (nextCourse) {
      var nl = nextLessonIn(nextCourse);
      app.appendChild(el('<section><div class="card next-up">' +
        '<div class="what"><span class="tag">Next up</span>' +
        "<h3>" + esc(nl ? nl.title : nextCourse.title) + "</h3>" +
        "<p>" + esc(nextCourse.title) + " · " + courseProgress(nextCourse).pct + "% complete</p></div>" +
        '<a class="btn primary" href="#/course/' + esc(nextCourse.id) + (nl ? "/" + esc(nl.id) : "") + '">Continue →</a>' +
        "</div></section>"));
    }

    var sec = el('<section><div class="section-head"><span class="num">01</span><h2>Courses in progress</h2>' +
      "<p>" + enrolled.length + " started</p></div></section>");
    var card = el('<div class="card"></div>');
    if (!enrolled.length) {
      card.appendChild(el('<p>Nothing started yet. Open the <a href="#/catalog">catalog</a> and begin with ' +
        "<a href=\"#/course/home-lab\">Build Your Home Lab</a>.</p>"));
    } else {
      enrolled.forEach(function (c) {
        var p = courseProgress(c);
        card.appendChild(el('<div class="enrolled-row">' + ring(p.pct, 44) +
          '<div class="meta-t"><a href="#/course/' + esc(c.id) + '">' + esc(c.title) + "</a>" +
          '<div class="sub">' + p.done + " / " + p.total + " lessons · " +
          esc((index.phases[c.phase] || {}).name || "") + "</div></div>" +
          '<a class="btn small ghost" href="#/course/' + esc(c.id) + '">Open</a></div>'));
      });
    }
    sec.appendChild(card);
    app.appendChild(sec);

    // milestones
    var msec = el('<section><div class="section-head"><span class="num">02</span><h2>Year-by-year milestones</h2>' +
      "<p>The plan, checked off as it happens</p></div></section>");
    var grid = el('<div class="milestones"></div>');
    (data.milestones || []).forEach(function (m) {
      var c2 = el('<div class="card milestone-card"><h3>Year ' + m.year + "</h3></div>");
      var ul = el("<ul></ul>");
      m.items.forEach(function (item, ii) {
        var key = "y" + m.year + "-" + ii;
        var checked = !!me().milestones[key];
        var li = el('<li class="' + (checked ? "checked" : "") + '"><input type="checkbox"' +
          (checked ? " checked" : "") + '><span>' + esc(item) + "</span></li>");
        li.querySelector("input").addEventListener("change", function (ev) {
          me().milestones[key] = ev.target.checked;
          save();
          li.classList.toggle("checked", ev.target.checked);
        });
        ul.appendChild(li);
      });
      c2.appendChild(ul);
      grid.appendChild(c2);
    });
    msec.appendChild(grid);
    app.appendChild(msec);
  }

  /* ------------------------------------------------------------ cert tracker */

  function viewCerts(app) {
    app.appendChild(el('<div class="page-head"><div class="eyebrow">Certifications</div>' +
      "<h1>Certification tracker</h1>" +
      '<p class="lede">Status, exam date, and cost for every certification in the curriculum, saved for ' +
      esc(state.current) + ". " + esc(data.meta.priceNote || "") + "</p></div>"));

    (data.certificationNotes || []).forEach(function (n) {
      app.appendChild(el('<div class="callout" style="margin-bottom:18px">' + esc(n) + "</div>"));
    });

    var wrap = el('<div class="table-wrap"></div>');
    var table = el('<table class="certs"><thead><tr>' +
      "<th>Certification</th><th>Vendor</th><th>Lane</th><th>Status</th><th>Exam date</th>" +
      "<th>Approx. cost</th><th>Renewal</th><th>Course</th></tr></thead><tbody></tbody></table>");
    var tbody = table.querySelector("tbody");

    (data.certifications || []).forEach(function (cert) {
      var rec = me().certs[cert.id] || { status: CERT_STATUSES[0], date: "" };
      var courseLink = cert.courseId && index.courses[cert.courseId]
        ? '<a href="#/course/' + esc(cert.courseId) + '">' + esc(index.courses[cert.courseId].title) + "</a>"
        : '<span style="color:var(--muted)">—</span>';
      var tr = el("<tr>" +
        '<td class="cert-name">' + esc(cert.name) +
        (cert.examCodes && cert.examCodes.length ? '<span class="codes">' + esc(cert.examCodes.join(" / ")) + "</span>" : "") +
        (cert.note ? '<span class="codes">' + esc(cert.note) + "</span>" : "") + "</td>" +
        "<td>" + esc(cert.vendor) + "</td>" +
        "<td>" + laneBadge(cert.lane) + "</td>" +
        "<td></td><td></td>" +
        "<td>" + esc(cert.cost) + "</td>" +
        "<td>" + esc(cert.renewal) + "</td>" +
        "<td>" + courseLink + "</td></tr>");

      var sel = el("<select>" + CERT_STATUSES.map(function (s) {
        return '<option value="' + esc(s) + '"' + (rec.status === s ? " selected" : "") + ">" + esc(s) + "</option>";
      }).join("") + "</select>");
      var dateInput = el('<input type="date" value="' + esc(rec.date || "") + '" aria-label="Exam date for ' + esc(cert.name) + '">');

      function paintRow() {
        tr.className = "st-" + (me().certs[cert.id] || rec).status.toLowerCase().replace(/\s+/g, "-");
      }
      sel.addEventListener("change", function () {
        var r = me().certs[cert.id] || (me().certs[cert.id] = { status: CERT_STATUSES[0], date: "" });
        r.status = sel.value; save(); paintRow();
      });
      dateInput.addEventListener("change", function () {
        var r = me().certs[cert.id] || (me().certs[cert.id] = { status: CERT_STATUSES[0], date: "" });
        r.date = dateInput.value; save();
      });

      tr.children[3].appendChild(sel);
      tr.children[4].appendChild(dateInput);
      paintRow();
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    app.appendChild(wrap);
  }

  /* ----------------------------------------------------------------- search */

  function runSearch(term) {
    var box = document.getElementById("search-results");
    term = term.trim().toLowerCase();
    if (term.length < 2) { box.hidden = true; box.innerHTML = ""; return; }

    var hits = [];
    data.courses.forEach(function (c) {
      if (c.title.toLowerCase().indexOf(term) > -1 || (c.summary || "").toLowerCase().indexOf(term) > -1) {
        hits.push({ kind: "Course", title: c.title, where: (index.phases[c.phase] || {}).name || "", href: "#/course/" + c.id });
      }
    });
    Object.keys(index.lessons).forEach(function (id) {
      var m = index.lessons[id];
      if (m.lesson.title.toLowerCase().indexOf(term) > -1) {
        hits.push({ kind: "Lesson", title: m.lesson.title, where: m.course.title + " · " + m.section.title,
          href: "#/course/" + m.course.id + "/" + m.lesson.id });
      }
    });

    box.innerHTML = hits.length
      ? hits.slice(0, 25).map(function (h) {
          return '<a href="' + esc(h.href) + '"><span class="kind">' + esc(h.kind) + "</span>" + esc(h.title) +
            '<span class="where">' + esc(h.where) + "</span></a>";
        }).join("") + (hits.length > 25 ? '<div class="empty">' + (hits.length - 25) + " more…</div>" : "")
      : '<div class="empty">Nothing matches “' + esc(term) + "”.</div>";
    box.hidden = false;
  }

  /* --------------------------------------------------------- learner + I/O */

  function paintLearnerSelect() {
    var sel = document.getElementById("learner");
    sel.innerHTML = Object.keys(state.learners).map(function (n) {
      return '<option value="' + esc(n) + '"' + (n === state.current ? " selected" : "") + ">" + esc(n) + "</option>";
    }).join("") + '<option value="__add">+ Add learner…</option>';
  }

  function exportProgress() {
    var payload = {
      app: "Cargill Academy", version: 1, exported: new Date().toISOString(),
      learner: state.current, progress: me()
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cargill-academy-" + state.current.toLowerCase().replace(/\W+/g, "-") + "-" + today() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { alert("That file is not valid JSON."); return; }

      // Accept both a single-learner export and a whole-store export.
      if (parsed && parsed.progress && parsed.learner) {
        var name = prompt("Import this progress into which learner?", parsed.learner) || parsed.learner;
        state.learners[name] = parsed.progress;
        state.current = name;
      } else if (parsed && parsed.learners) {
        state = parsed;
      } else {
        alert("That JSON does not look like a Cargill Academy export.");
        return;
      }
      state = (function () { var s = state; try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} return loadState(); })();
      paintLearnerSelect();
      render();
      alert("Progress imported for " + state.current + ".");
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------- boot */

  function wireChrome() {
    var sel = document.getElementById("learner");
    paintLearnerSelect();
    sel.addEventListener("change", function () {
      if (sel.value === "__add") {
        var name = (prompt("Name of the new learner:") || "").trim();
        if (name && !state.learners[name]) { state.learners[name] = blankLearner(); state.current = name; }
        else if (name && state.learners[name]) state.current = name;
      } else {
        state.current = sel.value;
      }
      save(); paintLearnerSelect(); render();
    });

    document.getElementById("export-btn").addEventListener("click", exportProgress);
    var fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) importProgress(fileInput.files[0]);
      fileInput.value = "";
    });

    var search = document.getElementById("search");
    search.addEventListener("input", function () { runSearch(search.value); });
    search.addEventListener("focus", function () { if (search.value) runSearch(search.value); });
    document.addEventListener("click", function (ev) {
      var box = document.getElementById("search-results");
      if (!box.hidden && !ev.target.closest(".search-wrap")) box.hidden = true;
    });
    document.getElementById("search-results").addEventListener("click", function (ev) {
      if (ev.target.closest("a")) { document.getElementById("search-results").hidden = true; search.value = ""; }
    });

    window.addEventListener("hashchange", render);
  }

  function fail(msg) {
    document.getElementById("app").innerHTML =
      '<div class="error-card"><h2>Could not load the curriculum</h2><p>' + msg + "</p>" +
      "<p>If you opened this file straight from disk, the browser blocks the fetch of " +
      "<code>curriculum.json</code>. Serve the folder instead:</p>" +
      "<p><code>python3 -m http.server 8000</code> then open <code>http://localhost:8000/academy.html</code></p></div>";
  }

  function boot() {
    state = loadState();
    fetch("curriculum.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        data = json;
        index = buildIndex();
        wireChrome();
        render();
      })
      .catch(function (e) { fail(esc(e.message)); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
