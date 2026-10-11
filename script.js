// ===== CONSTANTES =====
const SEUIL = 10;
const POIDS_COMPOSITION = 0.5; // part de la composition dans la note d'une matière (lycée)

// ===== DONNÉES =====
let ues = JSON.parse(localStorage.getItem("ues")) || [];
let config = JSON.parse(localStorage.getItem("configComp")) || { actif: false, seuil: 8 };
let matieresLycee = JSON.parse(localStorage.getItem("matieresLycee")) || [];

// ===== OUTIL =====
function el(tag, texte = "", classe = "") {
  const e = document.createElement(tag);
  if (texte) e.textContent = texte;
  if (classe) e.className = classe;
  return e;
}

// =====================================================
// MODE UNIVERSITÉ
// =====================================================
function sauvegarder() {
  localStorage.setItem("ues", JSON.stringify(ues));
}

function moyenneUE(ue) {
  const totalCoef = ue.matieres.reduce((s, m) => s + m.coef, 0);
  if (totalCoef === 0) return null;
  const points = ue.matieres.reduce((s, m) => s + m.note * m.coef, 0);
  return points / totalCoef;
}

function moyenneGenerale() {
  let points = 0, coefs = 0;
  ues.forEach(ue => ue.matieres.forEach(m => {
    points += m.note * m.coef;
    coefs += m.coef;
  }));
  return coefs === 0 ? null : points / coefs;
}

// Statut d'une UE : validée, validée par compensation ou non validée
function statutUE(moy, mg) {
  if (moy >= SEUIL) {
    return { texte: "UE validée", classe: "ok" };
  }
  if (config.actif && mg !== null && mg >= SEUIL && moy >= config.seuil) {
    return { texte: "UE validée par compensation", classe: "comp" };
  }
  return { texte: "UE non validée", classe: "ko" };
}

function lireConfig() {
  config.actif = document.getElementById("compActive").checked;
  const s = parseFloat(document.getElementById("compSeuil").value);
  config.seuil = isNaN(s) ? 8 : Math.min(Math.max(s, 0), SEUIL);
  localStorage.setItem("configComp", JSON.stringify(config));
  afficher();
}

function ajouterUE() {
  const champ = document.getElementById("nomUE");
  const nom = champ.value.trim();
  if (!nom) return;
  ues.push({ nom, matieres: [] });
  champ.value = "";
  afficher();
}

function ajouterMatiere() {
  if (ues.length === 0) {
    alert("Ajoutez d'abord une UE.");
    return;
  }
  const indexUE = parseInt(document.getElementById("choixUE").value);
  const nom = document.getElementById("nomMatiere").value.trim();
  const note = parseFloat(document.getElementById("note").value);
  const coef = parseInt(document.getElementById("coef").value);

  if (!nom || isNaN(note) || isNaN(coef)) {
    alert("Remplissez tous les champs.");
    return;
  }
  if (note < 0 || note > 20 || coef < 1) {
    alert("Note entre 0 et 20, coefficient d'au moins 1.");
    return;
  }

  ues[indexUE].matieres.push({ nom, note, coef });
  document.getElementById("nomMatiere").value = "";
  document.getElementById("note").value = "";
  document.getElementById("coef").value = "";
  afficher();
}

function supprimerUE(i) {
  ues.splice(i, 1);
  afficher();
}

function supprimerMatiere(i, j) {
  ues[i].matieres.splice(j, 1);
  afficher();
}

function toutEffacer() {
  if (confirm("Supprimer toutes les données ?")) {
    ues = [];
    afficher();
  }
}

function simuler() {
  const res = document.getElementById("simResultat");

  if (ues.length === 0) {
    res.textContent = "Ajoutez d'abord une UE.";
    res.className = "ko";
    return;
  }

  const ue = ues[parseInt(document.getElementById("simUE").value)];
  const coef = parseInt(document.getElementById("simCoef").value);
  let cible = parseFloat(document.getElementById("simCible").value);

  if (isNaN(cible)) cible = SEUIL;

  if (isNaN(coef) || coef < 1 || cible < 0 || cible > 20) {
    res.textContent = "Entrez un coefficient valide (1 ou plus) et une moyenne visée entre 0 et 20.";
    res.className = "ko";
    return;
  }

  const coefDeja = ue.matieres.reduce((s, m) => s + m.coef, 0);
  const pointsDeja = ue.matieres.reduce((s, m) => s + m.note * m.coef, 0);
  const noteNecessaire = (cible * (coefDeja + coef) - pointsDeja) / coef;

  if (noteNecessaire <= 0) {
    res.textContent = `UE "${ue.nom}" : la moyenne visée (${cible}) est déjà assurée, quelle que soit la note obtenue.`;
    res.className = "ok";
  } else if (noteNecessaire > 20) {
    res.textContent = `UE "${ue.nom}" : impossible d'atteindre ${cible}/20, il faudrait ${noteNecessaire.toFixed(2)}/20.`;
    res.className = "ko";
  } else {
    const noteMin = Math.ceil(noteNecessaire * 100) / 100;
    res.textContent = `UE "${ue.nom}" : il vous faut au minimum ${noteMin.toFixed(2)}/20 pour atteindre ${cible}/20.`;
    res.className = "ok";
  }
}

function afficher() {
  // Listes déroulantes des UE (la sélection actuelle est conservée)
  const select = document.getElementById("choixUE");
  const selectSim = document.getElementById("simUE");
  const choixActuel = select.value;
  const simActuel = selectSim.value;
  select.innerHTML = "";
  selectSim.innerHTML = "";

  ues.forEach((ue, i) => {
    const option = el("option", ue.nom);
    option.value = i;
    select.appendChild(option);

    const optionSim = el("option", ue.nom);
    optionSim.value = i;
    selectSim.appendChild(optionSim);
  });

  if (ues[choixActuel]) select.value = choixActuel;
  if (ues[simActuel]) selectSim.value = simActuel;

  // Cartes des UE
  const mg = moyenneGenerale();
  const zone = document.getElementById("resultats");
  zone.innerHTML = "";
  let nbCalculees = 0, nbNonValidees = 0, nbCompensees = 0;

  ues.forEach((ue, i) => {
    const carte = el("div", "", "carte");

    const entete = el("div", "", "entete");
    entete.appendChild(el("h3", ue.nom));
    const btnSupUE = el("button", "Supprimer l'UE", "danger");
    btnSupUE.onclick = () => supprimerUE(i);
    entete.appendChild(btnSupUE);
    carte.appendChild(entete);

    const ul = el("ul");
    ue.matieres.forEach((m, j) => {
      const li = el("li", `${m.nom} : ${m.note}/20 (coef ${m.coef})`);
      const btn = el("button", "✕", "petit");
      btn.onclick = () => supprimerMatiere(i, j);
      li.appendChild(btn);
      ul.appendChild(li);
    });
    carte.appendChild(ul);

    const moy = moyenneUE(ue);
    if (moy !== null) {
      const statut = statutUE(moy, mg);
      nbCalculees++;
      if (statut.classe === "ko") nbNonValidees++;
      if (statut.classe === "comp") nbCompensees++;
      carte.appendChild(el(
        "p",
        `Moyenne de l'UE : ${moy.toFixed(2)}/20 - ${statut.texte}`,
        statut.classe
      ));
    }
    zone.appendChild(carte);
  });

  // Moyenne générale et statut du semestre
  document.getElementById("moyenneGenerale").textContent =
    mg === null ? "Moyenne générale : -" : `Moyenne générale : ${mg.toFixed(2)}/20`;

  const statutSemestre = document.getElementById("statutSemestre");
  if (nbCalculees === 0) {
    statutSemestre.textContent = "";
    statutSemestre.className = "";
  } else if (nbNonValidees === 0) {
    statutSemestre.textContent = nbCompensees > 0
      ? `Semestre validé (dont ${nbCompensees} UE par compensation)`
      : "Semestre validé";
    statutSemestre.className = "ok";
  } else {
    statutSemestre.textContent = `Semestre non validé : ${nbNonValidees} UE non validée(s)`;
    statutSemestre.className = "ko";
  }

  sauvegarder();
}

// =====================================================
// MODE LYCÉE
// =====================================================
function noteMatiere(m) {
  // Anciennes données : une seule note saisie directement
  if (m.note !== undefined) return m.note;

  const aDevoirs = m.devoirs && m.devoirs.length > 0;
  const aCompo = m.composition !== null && m.composition !== undefined;

  if (aDevoirs && aCompo) {
    const moyDevoirs = m.devoirs.reduce((s, n) => s + n, 0) / m.devoirs.length;
    return moyDevoirs * (1 - POIDS_COMPOSITION) + m.composition * POIDS_COMPOSITION;
  }
  if (aDevoirs) {
    return m.devoirs.reduce((s, n) => s + n, 0) / m.devoirs.length;
  }
  return m.composition;
}

function mentionLycee(moyenne) {
  if (moyenne >= 16) return "Très bien";
  if (moyenne >= 14) return "Bien";
  if (moyenne >= 12) return "Assez bien";
  if (moyenne >= 10) return "Passable";
  return "Insuffisant";
}

function afficherLycee() {
  const liste = document.getElementById("lListe");
  liste.innerHTML = "";

  matieresLycee.forEach((m, i) => {
    const detail = [];
    if (m.devoirs && m.devoirs.length > 0) detail.push(`devoirs : ${m.devoirs.join(" ; ")}`);
    if (m.composition !== null && m.composition !== undefined) detail.push(`compo : ${m.composition}`);
    if (m.note !== undefined) detail.push("note directe");

    const li = el(
      "li",
      `${m.nom} : ${noteMatiere(m).toFixed(2)}/20 (coef ${m.coef}) - ${detail.join(", ")}`
    );
    const btn = el("button", "✕", "petit");
    btn.onclick = () => {
      matieresLycee.splice(i, 1);
      afficherLycee();
    };
    li.appendChild(btn);
    liste.appendChild(li);
  });

  const totalCoef = matieresLycee.reduce((s, m) => s + m.coef, 0);
  const totalPoints = matieresLycee.reduce((s, m) => s + noteMatiere(m) * m.coef, 0);
  const titre = document.getElementById("lMoyenne");
  const mention = document.getElementById("lMention");

  if (totalCoef === 0) {
    titre.textContent = "Moyenne : -";
    mention.textContent = "";
    mention.className = "";
  } else {
    const moyenne = totalPoints / totalCoef;
    titre.textContent = `Moyenne : ${moyenne.toFixed(2)}/20`;
    if (moyenne >= 10) {
      mention.textContent = `Moyenne suffisante - Mention : ${mentionLycee(moyenne)}`;
      mention.className = "ok";
    } else {
      mention.textContent = "Moyenne insuffisante (inférieure à 10)";
      mention.className = "ko";
    }
  }

  localStorage.setItem("matieresLycee", JSON.stringify(matieresLycee));
}

function ajouterMatiereLycee() {
  const nom = document.getElementById("lNom").value.trim();
  const texteDevoirs = document.getElementById("lDevoirs").value.trim();
  const texteCompo = document.getElementById("lCompo").value.trim();
  const coef = parseInt(document.getElementById("lCoef").value);

  const devoirs = texteDevoirs === ""
    ? []
    : texteDevoirs
        .split(/[;\s]+/)
        .filter(t => t !== "")
        .map(t => parseFloat(t.replace(",", ".")));
  const composition = texteCompo === "" ? null : parseFloat(texteCompo);

  if (!nom || isNaN(coef)) {
    alert("Indiquez la matière et le coefficient.");
    return;
  }
  if (devoirs.length === 0 && composition === null) {
    alert("Saisissez au moins un devoir ou la composition.");
    return;
  }

  const devoirsInvalides = devoirs.some(n => isNaN(n) || n < 0 || n > 20);
  const compoInvalide = composition !== null && (isNaN(composition) || composition < 0 || composition > 20);
  if (devoirsInvalides || compoInvalide || coef < 1) {
    alert("Les notes doivent être comprises entre 0 et 20, et le coefficient d'au moins 1.");
    return;
  }

  matieresLycee.push({ nom, devoirs, composition, coef });
  document.getElementById("lNom").value = "";
  document.getElementById("lDevoirs").value = "";
  document.getElementById("lCompo").value = "";
  document.getElementById("lCoef").value = "";
  afficherLycee();
}

function toutEffacerLycee() {
  if (confirm("Supprimer toutes les matières ?")) {
    matieresLycee = [];
    afficherLycee();
  }
}

// =====================================================
// CHANGEMENT DE MODE
// =====================================================
function changerMode() {
  const mode = document.getElementById("mode").value;
  document.getElementById("modeUniversite").hidden = mode !== "universite";
  document.getElementById("modeLycee").hidden = mode !== "lycee";
  localStorage.setItem("mode", mode);
}

// =====================================================
// ÉVÉNEMENTS ET DÉMARRAGE
// =====================================================
document.getElementById("btnUE").addEventListener("click", ajouterUE);
document.getElementById("btnMatiere").addEventListener("click", ajouterMatiere);
document.getElementById("btnSim").addEventListener("click", simuler);
document.getElementById("reset").addEventListener("click", toutEffacer);
document.getElementById("compActive").addEventListener("change", lireConfig);
document.getElementById("compSeuil").addEventListener("input", lireConfig);

document.getElementById("lAjouter").addEventListener("click", ajouterMatiereLycee);
document.getElementById("lReset").addEventListener("click", toutEffacerLycee);
document.getElementById("mode").addEventListener("change", changerMode);

document.getElementById("compActive").checked = config.actif;
document.getElementById("compSeuil").value = config.seuil;
document.getElementById("mode").value = localStorage.getItem("mode") || "universite";

changerMode();
afficher();
afficherLycee();