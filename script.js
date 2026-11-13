const KEY = "oficina-v1";
let orders = [],
    sel = null,
    pin = null;
try {
    const r = localStorage.getItem(KEY);
    if (r) orders = JSON.parse(r);
} catch (e) { }
sel = orders[0] ? orders[0].id : null;
const save = () => {
    try {
        localStorage.setItem(KEY, JSON.stringify(orders));
    } catch (e) { }
};
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (s) =>
    String(s == null ? "" : s).replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
const brl = (n) =>
    Number(n || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
const cur = () => orders.find((o) => o.id === sel);
const ST = ["Pendente", "Em andamento", "Concluído"];
const TIPOS = [
    "Amassado",
    "Risco",
    "Trinca",
    "Ferrugem",
    "Pintura descascada",
    "Outro",
];
const $ = (s) => document.querySelector(s);
function zona(p) {
    const E = p.x > 0 ? "esquerda" : "direita",
        M = p.x > 0 ? "esquerdo" : "direito",
        ax = Math.abs(p.x),
        z = p.z,
        y = p.y;
    if (z > 1.85) return "Para-choque dianteiro";
    if (z < -1.85) return "Para-choque traseiro";
    if (y > 1.47) return "Teto";
    if (y > 1.05) {
        if (ax > 0.7) return "Porta " + E;
        return z > -0.2 ? "Para-brisa" : "Vidro traseiro";
    }
    if (ax > 0.9) {
        if (z > 0.9) return "Paralama dianteiro " + M;
        if (z < -1.3) return "Lateral traseira " + E;
        return "Porta " + E;
    }
    return z >= -0.2 ? "Capô" : "Porta-malas";
}
let V = null;
function initView() {
    if (V || typeof THREE === "undefined") return V;
    const T = THREE,
        scene = new T.Scene(),
        cam = new T.PerspectiveCamera(38, 1, 0.1, 50);
    cam.position.set(0, 3.2, 9);
    cam.lookAt(0, 0.6, 0);
    const ren = new T.WebGLRenderer({ antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // ---------- luzes ----------
    scene.add(new T.HemisphereLight(0xffffff, 0x6b747b, 0.75));
    const dl = new T.DirectionalLight(0xffffff, 0.75);
    dl.position.set(4, 8, 5);
    scene.add(dl);
    const dl2 = new T.DirectionalLight(0xbcd4ff, 0.3);
    dl2.position.set(-5, 3, -4);
    scene.add(dl2);

    const rig = new T.Group(),
        car = new T.Group(),
        pins = new T.Group();
    rig.add(car);
    car.add(pins);
    scene.add(rig);
    rig.rotation.x = 0.3;
    car.rotation.y = 0.7;

    // ---------- ambiente falso para reflexos ----------
    const ek = document.createElement("canvas");
    ek.width = 512;
    ek.height = 256;
    const ec = ek.getContext("2d"),
        gr = ec.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#cfe3f7");
    gr.addColorStop(0.45, "#ffffff");
    gr.addColorStop(0.5, "#9aa6ad");
    gr.addColorStop(1, "#3a4146");
    ec.fillStyle = gr;
    ec.fillRect(0, 0, 512, 256);
    ec.fillStyle = "rgba(255,255,255,.95)";
    ec.fillRect(60, 40, 90, 30);
    ec.fillRect(300, 30, 120, 24);
    const env = new T.CanvasTexture(ek);
    env.mapping = T.EquirectangularReflectionMapping;

    // ---------- materiais ----------
    const mat = (c, o) =>
        new T.MeshPhongMaterial(Object.assign({ color: c, shininess: 40 }, o));
    const shiny = (c, r, sh) =>
        mat(c, {
            specular: 0xffffff,
            shininess: sh,
            envMap: env,
            reflectivity: r,
            combine: T.MixOperation,
        });
    const paint = shiny(0x2f6db5, 0.35, 120),
        chrome = shiny(0xd5dade, 0.8, 150),
        glass = mat(0x0c1822, {
            specular: 0xffffff,
            shininess: 150,
            envMap: env,
            reflectivity: 0.55,
            combine: T.MixOperation,
            transparent: true,
            opacity: 0.88,
        }),
        black = mat(0x15181b, { shininess: 10 }),
        headM = mat(0xfff6d8, { emissive: 0x887744 }),
        tailM = mat(0xd62b1f, { emissive: 0x6a1008 }),
        plateM = mat(0xf2f2f2);

    // ---------- helpers ----------
    const add = (geo, m, x, y, z) => {
        const mesh = new T.Mesh(geo, m);
        mesh.position.set(x, y, z);
        car.add(mesh);
        return mesh;
    };
    const box = (w, h, d, x, y, z, m) =>
        add(new T.BoxGeometry(w, h, d), m, x, y, z);
    // perfil lateral (x = comprimento, y = altura) extrudado na largura
    const extr = (shape, depth, bev) => {
        const g = new T.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: bev,
            bevelSize: bev,
            bevelSegments: 4,
            curveSegments: 14,
        });
        g.translate(0, 0, -depth / 2);
        g.rotateY(-Math.PI / 2); // x do perfil -> z do mundo (frente = +z)
        return g;
    };

    // ---------- carroceria ----------
    const bs = new T.Shape();
    bs.moveTo(-2.12, 0.3);
    bs.lineTo(2.12, 0.3);
    bs.lineTo(2.12, 0.52);
    bs.quadraticCurveTo(2.12, 0.75, 1.85, 0.77);
    bs.lineTo(0.8, 0.78);
    bs.lineTo(-1.5, 0.78);
    bs.quadraticCurveTo(-2.12, 0.74, -2.12, 0.5);
    bs.lineTo(-2.12, 0.3);
    const body = add(extr(bs, 1.84, 0.08), paint, 0, 0, 0);

    // ---------- cabine (vidros) + teto ----------
    const cs = new T.Shape();
    cs.moveTo(0.95, 0.74);
    cs.lineTo(0.3, 1.38);
    cs.lineTo(-0.85, 1.38);
    cs.lineTo(-1.45, 0.74);
    cs.lineTo(0.95, 0.74);
    const cabin = add(extr(cs, 1.5, 0.06), glass, 0, 0, 0);
    const roof = box(1.55, 0.06, 1.2, 0, 1.43, -0.27, paint);
    const hit = [body, cabin, roof];

    // ---------- detalhes laterais ----------
    [1, -1].forEach((s) => {
        [0.7, -0.3, -1.3].forEach((z) =>
            box(0.02, 0.42, 0.025, s * 1.005, 0.55, z, black),
        );
        [0.4, -0.6].forEach((z) =>
            box(0.025, 0.04, 0.2, s * 1.01, 0.68, z, chrome),
        );
        box(0.04, 0.62, 0.09, s * 0.82, 1.07, -0.3, black); // coluna B
        box(0.14, 0.1, 0.2, s * 0.97, 1.0, 0.6, paint); // retrovisor
    });

    // ---------- frente e traseira ----------
    [1, -1].forEach((s) => {
        box(0.55, 0.13, 0.06, s * 0.68, 0.58, 2.19, headM);
        box(0.55, 0.12, 0.06, s * 0.7, 0.6, -2.19, tailM);
    });
    box(0.8, 0.16, 0.06, 0, 0.48, 2.19, black); // grade
    box(1.2, 0.08, 0.06, 0, 0.33, 2.19, black); // entrada de ar
    box(0.5, 0.13, 0.04, 0, 0.4, 2.215, plateM); // placa dianteira
    box(0.5, 0.13, 0.04, 0, 0.45, -2.215, plateM); // placa traseira
    box(1.9, 0.05, 0.05, 0, 0.26, 2.17, black); // spoiler dianteiro
    box(1.9, 0.05, 0.05, 0, 0.26, -2.17, black);

    // ---------- rodas ----------
    [
        [1, 1.4],
        [-1, 1.4],
        [1, -1.4],
        [-1, -1.4],
    ].forEach(([sx, z]) => {
        // cava escura
        const arch = new T.Mesh(
            new T.CircleGeometry(0.46, 28),
            new T.MeshBasicMaterial({ color: 0x050607, side: T.DoubleSide }),
        );
        arch.rotation.y = (sx * Math.PI) / 2;
        arch.position.set(sx * 1.003, 0.4, z);
        car.add(arch);

        const w = new T.Group();
        w.position.set(sx * 0.93, 0.43, z);
        const tire = new T.Mesh(new T.TorusGeometry(0.33, 0.1, 16, 28), black);
        tire.rotation.y = Math.PI / 2;
        w.add(tire);
        const rim = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 0.18, 24), chrome);
        rim.rotation.z = Math.PI / 2;
        w.add(rim);
        for (let i = 0; i < 5; i++) {
            const sp = new T.Mesh(new T.BoxGeometry(0.03, 0.04, 0.46), black);
            sp.position.x = sx * 0.095;
            sp.rotation.x = (i * Math.PI) / 5;
            w.add(sp);
        }
        const hub = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.2, 12), chrome);
        hub.rotation.z = Math.PI / 2;
        w.add(hub);
        car.add(w);
    });

    // ---------- sombra suave no chão ----------
    const sk = document.createElement("canvas");
    sk.width = sk.height = 128;
    const sc = sk.getContext("2d"),
        rg = sc.createRadialGradient(64, 64, 10, 64, 64, 64);
    rg.addColorStop(0, "rgba(0,0,0,.45)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    sc.fillStyle = rg;
    sc.fillRect(0, 0, 128, 128);
    const g = new T.Mesh(
        new T.PlaneGeometry(6.5, 6.5),
        new T.MeshBasicMaterial({
            map: new T.CanvasTexture(sk),
            transparent: true,
            depthWrite: false,
        }),
    );
    g.rotation.x = -Math.PI / 2;
    g.scale.set(0.75, 1.1, 1);
    g.position.y = 0.01;
    rig.add(g);
    const cv = ren.domElement,
        draw = () => ren.render(scene, cam);
    const badge = (n, c) => {
        const k = document.createElement("canvas");
        k.width = k.height = 64;
        const x = k.getContext("2d");
        x.fillStyle = c;
        x.beginPath();
        x.arc(32, 32, 28, 0, 7);
        x.fill();
        x.lineWidth = 4;
        x.strokeStyle = "#fff";
        x.stroke();
        x.fillStyle = "#fff";
        x.font = "bold 32px sans-serif";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText(n, 32, 34);
        const s = new T.Sprite(
            new T.SpriteMaterial({ map: new T.CanvasTexture(k) }),
        );
        s.scale.set(0.42, 0.42, 1);
        return s;
    };
    let d = null;
    cv.addEventListener("pointerdown", (e) => {
        d = { x: e.clientX, y: e.clientY, m: 0 };
        cv.setPointerCapture(e.pointerId);
        cv.style.cursor = "grabbing";
    });
    cv.addEventListener("pointermove", (e) => {
        if (!d) return;
        const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
        d.m += Math.abs(dx) + Math.abs(dy);
        d.x = e.clientX;
        d.y = e.clientY;
        car.rotation.y += dx * 0.01;
        rig.rotation.x = Math.max(
            0,
            Math.min(1.2, rig.rotation.x + dy * 0.008),
        );
        draw();
    });
    cv.addEventListener("pointerup", (e) => {
        cv.style.cursor = "grab";
        const was = d;
        d = null;
        if (was && was.m < 6) pick(e);
    });
    function pick(e) {
        const r = cv.getBoundingClientRect(),
            rc = new T.Raycaster();
        rc.setFromCamera(
            new T.Vector2(
                ((e.clientX - r.left) / r.width) * 2 - 1,
                -((e.clientY - r.top) / r.height) * 2 + 1,
            ),
            cam,
        );
        scene.updateMatrixWorld(true);
        const h = rc.intersectObjects(hit)[0];
        if (!h) return;
        const p = car
            .worldToLocal(h.point.clone())
            .add(h.face.normal.clone().multiplyScalar(0.12)),
            f = (v) => Math.round(v * 100) / 100;
        pin = { x: f(p.x), y: f(p.y), z: f(p.z) };
        renderDetail();
    }
    V = {
        mount(o) {
            const st = $("#stage");
            st.appendChild(cv);
            const w = st.clientWidth,
                h = st.clientHeight;
            ren.setSize(w, h);
            cam.aspect = w / h;
            cam.updateProjectionMatrix();
            pins.children.slice().forEach((c) => {
                c.material.map.dispose();
                c.material.dispose();
                pins.remove(c);
            });
            o.avarias.forEach((a, i) => {
                if (a.z === undefined) return;
                const s = badge(i + 1, "#C93B22");
                s.position.set(a.x, a.y, a.z);
                pins.add(s);
            });
            if (pin) {
                const s = badge("+", "#1F5FA8");
                s.position.set(pin.x, pin.y, pin.z);
                pins.add(s);
            }
            draw();
        },
    };
    return V;
}
function renderList() {
    $("#list").innerHTML = orders.length
        ? orders
            .map(
                (o) =>
                    `<button class="os ${o.id === sel ? "on" : ""}" data-act="sel" data-id="${o.id}"><b>${esc(o.placa || "Sem placa")}</b> ${esc(o.modelo)}<small>${esc(o.cliente || "Cliente sem nome")} · ${new Date(o.entrada).toLocaleDateString("pt-BR")}</small></button>`,
            )
            .join("")
        : '<p class="empty">Nenhuma ordem ainda.</p>';
}
function carSvg(o) {
    const pins = o.avarias
        .map(
            (a, i) =>
                `<g class="pin" transform="translate(${a.x} ${a.y})"><circle r="10"/><text y="4">${i + 1}</text></g>`,
        )
        .join("");
    const pend = pin
        ? `<circle class="pend" cx="${pin.x}" cy="${pin.y}" r="11"/>`
        : "";
    return `<svg id="car" viewBox="0 0 200 400" role="img" aria-label="Carro visto de cima. Clique para marcar uma avaria.">
  <rect class="car-w" x="14" y="82" width="16" height="48" rx="5"/><rect class="car-w" x="170" y="82" width="16" height="48" rx="5"/>
  <rect class="car-w" x="14" y="268" width="16" height="48" rx="5"/><rect class="car-w" x="170" y="268" width="16" height="48" rx="5"/>
  <rect class="car-b" x="100" y="0" width="0" height="0"/>
  <path class="car-b" d="M100 14C150 14 168 34 170 78L174 300C174 350 150 386 100 386C50 386 26 350 26 300L30 78C32 34 50 14 100 14Z"/>
  <path class="car-g" d="M54 138Q100 124 146 138L152 176Q100 166 48 176Z"/>
  <path class="car-g" d="M50 262Q100 272 150 262L146 296Q100 306 54 296Z"/>
  <rect class="car-g" x="40" y="178" width="120" height="82" rx="14" style="fill:var(--surface)"/>
  <rect class="car-b" x="14" y="150" width="14" height="22" rx="5"/><rect class="car-b" x="172" y="150" width="14" height="22" rx="5"/>
  <text class="car-t" x="100" y="396">Traseira</text><text class="car-t" x="100" y="10">Frente</text>
  ${pins}${pend}</svg>`;
}
function renderDetail() {
    const o = cur(),
        el = $("#detail");
    if (!o) {
        el.innerHTML =
            '<section><p class="empty">Nenhuma ordem aberta. Clique em “Nova ordem” para registrar a entrada de um carro.</p></section>';
        return;
    }
    const f = (k, l, t = "text", ph = "") =>
        `<label>${l}<input data-f="${k}" type="${t}" value="${esc(o[k])}" placeholder="${ph}"></label>`;
    const total = o.servicos.reduce((s, x) => s + Number(x.valor || 0), 0);
    el.innerHTML = `
  <section><h2>Cliente e veículo</h2><div class="grid">
  ${f("cliente", "Cliente")}${f("tel", "Telefone", "tel")}${f("placa", "Placa", "text", "ABC1D23")}${f("modelo", "Modelo", "text", "Ex.: Gol 1.0")}${f("cor", "Cor")}${f("km", "Quilometragem", "number")}
  </div></section>
  <section><h2>Serviços a fazer</h2>
  ${o.servicos.length ? o.servicos.map((s) => `<div class="row"><span class="d">${esc(s.desc)}</span><span>${brl(s.valor)}</span><button class="badge s${s.status}" data-act="cycle" data-id="${s.id}" title="Clique para mudar o status">${ST[s.status]}</button><button class="ghost" data-act="rmsvc" data-id="${s.id}" aria-label="Remover serviço">✕</button></div>`).join("") : '<p class="empty">Nenhum serviço adicionado.</p>'}
  <div class="add"><input id="sd" placeholder="Descrição do serviço" aria-label="Descrição do serviço"><input id="sv" type="number" min="0" step="0.01" placeholder="Valor (R$)" aria-label="Valor"><button class="pri" data-act="addsvc">Adicionar serviço</button></div>
  <div class="total">Total: ${brl(total)}</div></section>
  <section><h2>Vistoria da lataria</h2><div class="vist"><div><div id="stage"></div><p class="hint">Arraste para girar · clique no carro para marcar a avaria</p></div>
  <div>${pin ? `<div class="pinform"><b>${zona(pin)}</b><select id="pt" aria-label="Tipo de avaria">${TIPOS.map((t) => `<option>${t}</option>`).join("")}</select><input id="po" placeholder="Observação (opcional)"><div style="display:flex;gap:8px"><button class="pri" data-act="addpin">Registrar avaria</button><button data-act="cancelpin">Cancelar</button></div></div>` : ""}
  ${o.avarias.length ? o.avarias.map((a, i) => `<div class="row"><span class="num">${i + 1}</span><span class="d"><b>${esc(a.tipo)}</b> · ${esc(a.zona)}${a.obs ? '<br><span class="empty">' + esc(a.obs) + "</span>" : ""}</span><button class="ghost" data-act="rmav" data-id="${a.id}" aria-label="Remover avaria">✕</button></div>`).join("") : pin ? "" : '<p class="empty">Nenhuma avaria registrada. Se o carro está sem danos, deixe em branco.</p>'}
  </div></div></section>
  <section class="noprint"><button class="ghost" data-act="delorder">Excluir esta ordem</button></section>`;
    const st = $("#stage");
    if (st) {
        if (initView()) V.mount(o);
        else st.textContent = "Não foi possível carregar o 3D.";
    }
    if (pin) {
        const p = $("#po");
        if (p) p.focus();
    }
}
function render() {
    renderList();
    renderDetail();
}
document.addEventListener("click", (e) => {
    const svg = e.target.closest("#car");
    if (svg && !e.target.closest(".pin")) {
        const el = $("#car"),
            p = el.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        const q = p.matrixTransform(el.getScreenCTM().inverse());
        pin = { x: Math.round(q.x), y: Math.round(q.y) };
        renderDetail();
        return;
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act,
        o = cur(),
        id = b.dataset.id;
    if (a === "new") {
        const n = {
            id: uid(),
            entrada: new Date().toISOString(),
            cliente: "",
            tel: "",
            placa: "",
            modelo: "",
            cor: "",
            km: "",
            servicos: [],
            avarias: [],
        };
        orders.unshift(n);
        sel = n.id;
        pin = null;
    } else if (a === "sel") {
        sel = id;
        pin = null;
    } else if (a === "print") {
        window.print();
        return;
    } else if (!o) return;
    else if (a === "addsvc") {
        const d = $("#sd").value.trim();
        if (!d) {
            $("#sd").focus();
            return;
        }
        o.servicos.push({
            id: uid(),
            desc: d,
            valor: parseFloat($("#sv").value) || 0,
            status: 0,
        });
    } else if (a === "rmsvc")
        o.servicos = o.servicos.filter((s) => s.id !== id);
    else if (a === "cycle") {
        const s = o.servicos.find((x) => x.id === id);
        s.status = (s.status + 1) % 3;
    } else if (a === "addpin") {
        o.avarias.push({
            id: uid(),
            x: pin.x,
            y: pin.y,
            z: pin.z,
            zona: zona(pin),
            tipo: $("#pt").value,
            obs: $("#po").value.trim(),
        });
        pin = null;
    } else if (a === "cancelpin") pin = null;
    else if (a === "rmav") o.avarias = o.avarias.filter((v) => v.id !== id);
    else if (a === "delorder") {
        if (!confirm("Excluir esta ordem de serviço?")) return;
        orders = orders.filter((x) => x.id !== o.id);
        sel = orders[0] ? orders[0].id : null;
        pin = null;
    }
    save();
    render();
});
document.addEventListener("input", (e) => {
    const k = e.target.dataset.f,
        o = cur();
    if (!k || !o) return;
    o[k] = e.target.value;
    save();
    renderList();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.target.id === "sd" || e.target.id === "sv"))
        document.querySelector('[data-act="addsvc"]').click();
    if (e.key === "Enter" && e.target.id === "po")
        document.querySelector('[data-act="addpin"]').click();
});
window.addEventListener("resize", () => {
    const o = cur();
    if (o && V && $("#stage")) V.mount(o);
});
render();