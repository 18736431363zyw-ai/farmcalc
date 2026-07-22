// ========== 常量 ==========
const NO_FERT_PLANTS_PER_2_SEC = 18;
const NORMAL_FERT_PLANTS_PER_2_SEC = 12;
const NO_FERT_PLANT_SPEED = NO_FERT_PLANTS_PER_2_SEC / 2; // 9
const NORMAL_FERT_PLANT_SPEED = NORMAL_FERT_PLANTS_PER_2_SEC / 2; // 6
const FERT_OPERATION_SEC_PER_LAND = 0.1; // 每块地每次施肥操作 100ms

// ========== 数据 ==========
let seedData = [];
let plantPhaseMap = {};
let plantPhaseDurationsMap = {};
let seedImageMap = {};
let seedNameImageMap = {};
let landData = [];
let landTypeData = []; // 土地类型加成表
let calculatedRows = [];
let currentRankTab = 'noFert';

// 土地配置（根据UI输入）
let landConfig = {
    normal: 0,
    red: 0,
    black: 0,
    gold: 0,
    amethyst: 0
};

// 计算土地加成的加权聚合
function getLandAggregates() {
    const counts = landConfig;
    const types = landTypeData;
    let total = 0;
    let yieldSum = 0;
    let growPenaltySum = 0;
    let expBonusSum = 0;
    for (const t of types) {
        const c = Math.max(0, Number(counts[t.id] || 0));
        if (c <= 0) continue;
        total += c;
        yieldSum += c * t.yield;
        growPenaltySum += c * t.growPenalty;
        expBonusSum += c * t.expBonus;
    }
    return {
        total,
        avgYield: total > 0 ? yieldSum / total : 0,
        avgGrowPenalty: total > 0 ? growPenaltySum / total : 0,
        avgExpBonus: total > 0 ? expBonusSum / total : 0,
    };
}

// 作物 emoji 映射
const cropEmojis = {
    '白萝卜': '🥕', '胡萝卜': '🥕', '大白菜': '🥬', '大蒜': '🧄', '大葱': '🧅',
    '水稻': '🌾', '小麦': '🌾', '玉米': '🌽', '鲜姜': '🫚', '土豆': '🥔',
    '小白菜': '🥬', '生菜': '🥬', '油菜': '🌿', '茄子': '🍆', '红枣': '🫘',
    '蒲公英': '🌼', '银莲花': '🌸', '番茄': '🍅', '花菜': '🥦', '韭菜': '🌿',
    '小雏菊': '🌼', '豌豆': '🫛', '莲藕': '🪷', '红玫瑰': '🌹', '秋菊（黄色）': '🌻',
    '满天星': '💫', '含羞草': '🌿', '牵牛花': '🌺', '秋菊（红色）': '🌺', '辣椒': '🌶️',
    '黄瓜': '🥒', '芹菜': '🌿', '天香百合': '🌷', '南瓜': '🎃', '核桃': '🌰',
    '山楂': '🍒', '菠菜': '🥬', '草莓': '🍓', '苹果': '🍎', '四叶草': '🍀',
    '非洲菊': '🌼', '火绒草': '🌿', '花香根鸢尾': '💐', '虞美人': '🌺', '向日葵': '🌻',
    '西瓜': '🍉', '黄豆': '🫘', '香蕉': '🍌', '竹笋': '🎋', '桃子': '🍑',
    '甘蔗': '🎋', '橙子': '🍊', '茉莉花': '🌸', '葡萄': '🍇', '丝瓜': '🥒',
    '榛子': '🌰', '迎春花': '🌼', '石榴': '🍎', '栗子': '🌰', '柚子': '🍊',
    '蘑菇': '🍄', '菠萝': '🍍', '箬竹': '🎋', '无花果': '🫒', '椰子': '🥥',
    '花生': '🥜', '金针菇': '🍄', '葫芦': '🫑', '猕猴桃': '🥝', '梨': '🍐',
    '睡莲': '🪷', '火龙果': '🐉', '枇杷': '🍑', '樱桃': '🍒', '李子': '🫐',
    '荔枝': '🍒', '香瓜': '🍈', '木瓜': '🥭', '桂圆': '🫐', '月柿': '🍊',
    '杨桃': '⭐', '哈密瓜': '🍈', '桑葚': '🫐', '柠檬': '🍋', '芒果': '🥭',
    '杨梅': '🫐', '榴莲': '🥭', '番石榴': '🍈', '瓶子树': '🌳', '蓝莓': '🫐',
    '猪笼草': '🌿', '山竹': '🍑', '曼陀罗华': '🌸', '曼珠沙华': '🌺', '苦瓜': '🥒',
    '天堂鸟': '🦜', '冬瓜': '🥒', '豹皮花': '🌺', '杏子': '🍑', '金桔': '🍊',
};

function getCropEmoji(name) {
    return cropEmojis[name] || '🌱';
}

function getCropImage(seedId, name, size = 32) {
    const fileName = seedImageMap[seedId] || seedNameImageMap[name];
    if (fileName) {
        const imgUrl = `https://raw.githubusercontent.com/emjio/FarmCalc/main/seed_images_named/${encodeURIComponent(fileName)}`;
        return `<img src="${imgUrl}" alt="${name}" class="crop-img" loading="lazy" style="width:${size}px;height:${size}px;" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='inline-block')">` +
               `<span class="crop-emoji-fallback" style="font-size:${size * 0.9}px;display:none;vertical-align:middle;">${getCropEmoji(name)}</span>`;
    }
    return `<span style="font-size:${size * 0.9}px;display:inline-block;vertical-align:middle;">${getCropEmoji(name)}</span>`;
}

// ========== 初始化 ==========
async function init() {
    try {
        const [seedRes, plantRes, mappingRes, landRes, landTypeRes] = await Promise.all([
            fetch('seed-shop-merged-export.json'),
            fetch('Plant.json'),
            fetch('seed_mapping.json'),
            fetch('Land.json'),
            fetch('LandType.json').catch(() => ({ json: async () => ({ types: [] }) })),
        ]);
        const seedJson = await seedRes.json();
        const plantJson = await plantRes.json();
        const mappingJson = await mappingRes.json();
        landData = await landRes.json();
        const landTypeJson = await landTypeRes.json();
        landTypeData = landTypeJson.types || [];
        // 真实24块地的升级成本表：{ "1": { "normal":{...}, "red":{...}, ... }, "2": {...}, ... }
        window.__landTable = landTypeJson.lands || null;

        // 构建 seedId -> 图片文件名 映射 + name -> 图片文件名 映射
        seedImageMap = {};
        seedNameImageMap = {};
        for (const m of mappingJson) {
            const sid = Number(m.seedId);
            if (sid > 0 && m.fileName) {
                seedImageMap[sid] = m.fileName;
            }
            if (m.name && m.fileName && m.name !== '未知') {
                seedNameImageMap[m.name] = m.fileName;
            }
        }

        seedData = Array.isArray(seedJson) ? seedJson : (seedJson.rows || seedJson.seeds || []);

        // 构建 plant phase map
        plantPhaseMap = {};
        plantPhaseDurationsMap = {};
        for (const p of plantJson) {
            const seedId = Number(p.seed_id) || 0;
            if (seedId <= 0 || plantPhaseMap[seedId]) continue;
            const phases = parseGrowPhases(p.grow_phases);
            if (phases.length > 0) {
                plantPhaseMap[seedId] = phases[0];
                plantPhaseDurationsMap[seedId] = phases;
            }
        }

        // 根据默认等级自动设置土地数
        updateLandsByLevel();

        // 初始化土地配置输入
        initLandConfig();

        // 监听等级输入变化，自动更新土地数
        const inputLevel = document.getElementById('inputLevel');
        inputLevel.addEventListener('input', updateLandsByLevel);
        inputLevel.addEventListener('change', updateLandsByLevel);

        // 初始计算
        // calculate();
        renderCatalog();
        bindSkillControls();
    } catch (e) {
        console.error('初始化失败:', e);
    }
}

function parseGrowPhases(growPhases) {
    if (!growPhases || typeof growPhases !== 'string') return [];
    return growPhases
        .split(';')
        .map(x => x.trim())
        .filter(Boolean)
        .map(seg => {
            const parts = seg.split(':');
            return parts.length >= 2 ? (Number(parts[1]) || 0) : 0;
        })
        .filter(sec => sec > 0);
}

function getLandsByLevel(level) {
    if (!landData || landData.length === 0) return 6;
    let count = 0;
    for (const land of landData) {
        if ((land.level_need || 0) <= level) count++;
    }
    return Math.max(1, count);
}

function updateLandsByLevel() {
    const level = Math.max(1, Math.min(100, parseInt(document.getElementById('inputLevel').value) || 1));
    const lands = getLandsByLevel(level);
    document.getElementById('inputLands').value = lands;
    // 如果土地配置总量与已解锁数不一致，重设默认配置
    const cfgTotal = Object.values(landConfig).reduce((s, v) => s + v, 0);
    if (cfgTotal !== lands) {
        const defaults = defaultLandConfig(lands, level);
        const inputs = document.querySelectorAll('.land-type-input');
        inputs.forEach(el => {
            const t = el.dataset.type;
            el.value = defaults[t] || 0;
            landConfig[t] = defaults[t] || 0;
        });
        updateLandConfigSummary();
    }
}

// 默认土地配置：按玩家当前等级从真实 lands 表里反推
// 规则：每种土地类型，从地块1开始往后逐块查 lands[slot][type].level
//      当查到的 level > 玩家等级时停止，此类型就到这块为止
// 输出：{normal:N, red:R, black:B, gold:G, amethyst:A}
function defaultLandConfig(totalLands, level) {
    const lv = level || Math.max(1, parseInt(document.getElementById('inputLevel').value) || 27);
    const table = window.__landTable || {};
    const cfg = { normal: 0, red: 0, black: 0, gold: 0, amethyst: 0 };
    const order = ['amethyst', 'gold', 'black', 'red', 'normal'];
    // 先计算每种类型在当前等级下最多能开几块
    const maxUp = {};
    for (const t of order) {
        let count = 0;
        for (let slot = 1; slot <= totalLands; slot++) {
            const slotData = table[String(slot)];
            if (!slotData || !slotData[t]) break;
            const lv_need = slotData[t].level || 0;
            if (lv_need <= lv) count++;
            else break;
        }
        maxUp[t] = count;
    }
    // 优先级分配：紫晶 > 金 > 黑 > 红 > 普通
    let rest = totalLands;
    for (const t of order) {
        const take = Math.min(rest, maxUp[t] || 0);
        cfg[t] = take;
        rest -= take;
    }
    if (rest > 0) cfg.normal += rest;
    return cfg;
}

function initLandConfig() {
    const totalLands = Math.max(1, parseInt(document.getElementById('inputLands').value) || 18);
    const level = Math.max(1, parseInt(document.getElementById('inputLevel').value) || 27);
    const defaults = defaultLandConfig(totalLands, level);
    const inputs = document.querySelectorAll('.land-type-input');
    inputs.forEach(el => {
        const t = el.dataset.type;
        el.value = defaults[t] || 0;
        landConfig[t] = defaults[t] || 0;
        el.addEventListener('input', () => {
            const v = Math.max(0, parseInt(el.value) || 0);
            landConfig[t] = v;
            updateLandConfigSummary();
        });
    });
    updateLandConfigSummary();
}

function updateLandConfigSummary() {
    const agg = getLandAggregates();
    const elTotal = document.getElementById('landConfigTotal');
    const elYield = document.getElementById('landConfigYield');
    const elExp = document.getElementById('landConfigExp');
    const elGrow = document.getElementById('landConfigGrow');
    if (elTotal) {
        elTotal.textContent = agg.total;
        const unlocked = Math.max(1, parseInt(document.getElementById('inputLands').value) || 18);
        if (agg.total !== unlocked) elTotal.classList.add('warn'); else elTotal.classList.remove('warn');
    }
    if (elYield) elYield.textContent = agg.avgYield.toFixed(2);
    if (elExp)  elExp.textContent  = (agg.avgExpBonus >= 0 ? '+' : '') + Math.round(agg.avgExpBonus * 100) + '%';
    if (elGrow) elGrow.textContent = '+' + Math.round(agg.avgGrowPenalty * 100) + '%';
}

function formatSec(sec) {
    const s = Math.max(0, Math.round(sec));
    if (s < 60) return `${s}秒`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m < 60) return r > 0 ? `${m}分${r}秒` : `${m}分钟`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm > 0 ? `${h}小时${mm}分` : `${h}小时`;
}

function formatDuration(sec) {
    if (!Number.isFinite(sec)) return '无限';
    const s = Math.max(0, Math.round(sec));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}天${h}小时`;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分钟`;
    return `${s}秒`;
}

function estimateOrganicSupportSec(row, organicBudgetSec) {
    if (!row || organicBudgetSec <= 0) return 0;
    const consumePerCycle = Number(row.organicReduceAppliedSec) || 0;
    if (consumePerCycle <= 0) return Infinity;
    return (organicBudgetSec / consumePerCycle) * row.cycleOrganic;
}

function bindSkillControls() {
    const normalToggle = document.getElementById('skillFertilizer');
    const organicToggle = document.getElementById('skillOrganicFertilizer');
    const organicSettings = document.getElementById('organicSettings');
    if (!normalToggle || !organicToggle || !organicSettings) return;

    const syncUI = () => {
        const useOrganic = organicToggle.checked;
        organicSettings.style.display = useOrganic ? '' : 'none';
        if (useOrganic) {
            normalToggle.checked = true;
            normalToggle.disabled = true;
            normalToggle.parentElement.classList.add('is-disabled');
        } else {
            normalToggle.disabled = false;
            normalToggle.parentElement.classList.remove('is-disabled');
        }
        setRankingModeVisibility(useOrganic);
    };

    organicToggle.addEventListener('change', syncUI);
    normalToggle.addEventListener('change', () => {
        if (organicToggle.checked && !normalToggle.checked) {
            normalToggle.checked = true;
        }
    });
    syncUI();
}

function setRankingModeVisibility(useOrganic) {
    const tabNoFert = document.getElementById('tabNoFert');
    const tabFert = document.getElementById('tabFert');
    const tabOrganic = document.getElementById('tabOrganic');
    if (!tabNoFert || !tabFert || !tabOrganic) return;

    if (useOrganic) {
        tabNoFert.style.display = 'none';
        tabFert.style.display = 'none';
        tabOrganic.style.display = '';
        currentRankTab = 'organic';
        document.querySelectorAll('.clay-tab').forEach(t => t.classList.remove('active'));
        tabOrganic.classList.add('active');
    } else {
        tabNoFert.style.display = '';
        tabFert.style.display = '';
        tabOrganic.style.display = 'none';
        if (currentRankTab === 'organic') currentRankTab = 'noFert';
        document.querySelectorAll('.clay-tab').forEach(t => t.classList.remove('active'));
        const activeBtn = currentRankTab === 'fert' ? tabFert : tabNoFert;
        activeBtn.classList.add('active');
    }
}

function calcOrganicByPhases(phaseDurations, organicReduceSec) {
    if (!Array.isArray(phaseDurations) || phaseDurations.length === 0 || organicReduceSec <= 0) {
        return { reducedSec: 0, useCount: 0 };
    }

    let budget = organicReduceSec;
    let reducedSec = 0;
    let useCount = 0;

    for (const phaseSec of phaseDurations) {
        if (budget <= 0) break;
        if (phaseSec <= 0) continue;

        if (budget >= phaseSec) {
            reducedSec += phaseSec;
            budget -= phaseSec;
            useCount += 1;
            continue;
        }

        // 预算不足一个完整阶段时，仍需施一次有机肥来吃掉本阶段剩余时间
        reducedSec += budget;
        useCount += 1;
        budget = 0;
    }

    return { reducedSec, useCount };
}

// ========== 核心计算 ==========
function buildRows(lands, level, organicReduceSec = 0) {
    const plantSecNoFert = lands / NO_FERT_PLANT_SPEED;
    const plantSecFert = lands / NORMAL_FERT_PLANT_SPEED;
    const fertActionSec = lands * FERT_OPERATION_SEC_PER_LAND;
    const rows = [];

    // 土地等级加成：考虑用户配置的高级别土地占比
    const landAgg = getLandAggregates();
    const expMul = 1 + landAgg.avgExpBonus;        // 经验加成（高级土地加经验）
    const growMul = 1 + landAgg.avgGrowPenalty;    // 生长时间惩罚（高级土地生长更慢）
    const yieldMul = landAgg.avgYield;             // 平均产量倍率（金币计算使用）

    for (const s of seedData) {
        const seedId = Number(s.seedId || s.seed_id) || 0;
        const name = s.name || `seed_${seedId}`;
        const requiredLevel = Number(s.requiredLevel || s.required_level || 1) || 1;
        const price = Number(s.price) || 0;
        const exp = Number(s.exp) || 0;
        const growTimeSec = Number(s.growTimeSec || s.growTime || s.grow_time || 0) || 0;
        const seasons = Number(s.seasons) || 1;

        if (seedId <= 0 || growTimeSec <= 0) continue;
        if (level && requiredLevel > level) continue;

        // 应用土地生长时间惩罚
        const landGrowTimeSec = growTimeSec * growMul;
        const fullPhases = plantPhaseDurationsMap[seedId] || [];
        const reduceSec = plantPhaseMap[seedId] || 0;
        // 施肥减免也按比例缩放，保持各阶段比例一致
        const scaledReduceSec = reduceSec * growMul;
        const growTimeFert = Math.max(1, landGrowTimeSec - scaledReduceSec);

        // 普通肥后，按阶段模拟有机肥：每次只清当前阶段，进入下一阶段后需再次施肥
        const phasesAfterNormal = fullPhases.length > 1 ? fullPhases.slice(1).map(p => p * growMul) : [growTimeFert];
        const organicResult = calcOrganicByPhases(phasesAfterNormal, organicReduceSec);
        const growTimeOrganic = Math.max(1, growTimeFert - organicResult.reducedSec);

        const cycleNoFert = landGrowTimeSec + plantSecNoFert;
        const cycleFert = growTimeFert + plantSecFert + fertActionSec; // 普通肥 1 次操作
        const cycleOrganic = growTimeOrganic + plantSecFert + fertActionSec + (organicResult.useCount * fertActionSec);

        // 经验计算：每季收获的 exp 乘以经验土地加成
        const expWithBonus = exp * expMul;
        const expPerHourNoFert = (lands * expWithBonus / cycleNoFert) * 3600;
        const expPerHourFert = (lands * expWithBonus / cycleFert) * 3600;
        const expPerHourOrganic = (lands * expWithBonus / cycleOrganic) * 3600;
        const gainPercent = expPerHourNoFert > 0
            ? ((expPerHourFert - expPerHourNoFert) / expPerHourNoFert) * 100
            : 0;
        const organicGainPercent = expPerHourFert > 0
            ? ((expPerHourOrganic - expPerHourFert) / expPerHourFert) * 100
            : 0;

        // 金币计算：基础价格 + 产量倍率加成（仅作为参考，优先级低）
        const goldPerCycle = price * yieldMul;

        rows.push({
            seedId,
            name,
            requiredLevel,
            price,
            exp,
            expWithBonus,
            growTimeSec: landGrowTimeSec,
            growTimeStr: formatSec(landGrowTimeSec),
            seasons,
            reduceSec: scaledReduceSec,
            growTimeFert,
            growTimeFertStr: formatSec(growTimeFert),
            growTimeOrganic,
            growTimeOrganicStr: formatSec(growTimeOrganic),
            organicUseCount: organicResult.useCount,
            organicReduceAppliedSec: organicResult.reducedSec,
            cycleNoFert,
            cycleFert,
            cycleOrganic,
            expPerHourNoFert,
            expPerHourFert,
            expPerHourOrganic,
            expPerDayNoFert: expPerHourNoFert * 24,
            expPerDayFert: expPerHourFert * 24,
            expPerDayOrganic: expPerHourOrganic * 24,
            gainPercent,
            organicGainPercent,
            yieldMul,
            goldPerCycle,
            expMul,
            growMul,
        });
    }

    return rows;
}

// ========== 计算入口 ==========
function calculate() {
    const level = Math.max(1, Math.min(100, parseInt(document.getElementById('inputLevel').value) || 27));
    const lands = Math.max(1, parseInt(document.getElementById('inputLands').value) || 18);
    const useOrganic = document.getElementById('skillOrganicFertilizer').checked;
    const useFert = document.getElementById('skillFertilizer').checked || useOrganic;
    const organicMinutes = Math.max(0, parseInt(document.getElementById('inputOrganicMinutes').value) || 0);
    const organicReduceSec = useOrganic ? organicMinutes * 60 : 0;

    // 同步土地配置（如果用户还没动过 input、总数与解锁数不匹配，重新默认分配）
    const cfgTotal = Object.values(landConfig).reduce((s, v) => s + v, 0);
    if (cfgTotal === 0 || cfgTotal > lands) {
        initLandConfig();
    } else {
        updateLandConfigSummary();
    }

    calculatedRows = buildRows(lands, level, organicReduceSec);

    // 隐藏引导占位
    const placeholder = document.getElementById('cardPlaceholder');
    if (placeholder) placeholder.style.display = 'none';

    if (calculatedRows.length === 0) return;

    // 排序
    const sortedNoFert = [...calculatedRows].sort((a, b) => b.expPerHourNoFert - a.expPerHourNoFert);
    const sortedFert = [...calculatedRows].sort((a, b) => b.expPerHourFert - a.expPerHourFert);
    const sortedOrganic = [...calculatedRows].sort((a, b) => b.expPerHourOrganic - a.expPerHourOrganic);

    const bestNo = sortedNoFert[0];
    const bestFert = sortedFert[0];
    const bestOrganic = sortedOrganic[0];

    if (!useOrganic) {
        // 渲染不施肥推荐
        const cardNoFert = document.getElementById('cardNoFert');
        cardNoFert.style.display = '';
        cardNoFert.classList.add('fade-in');
        document.getElementById('noFertName').innerHTML = `${getCropImage(bestNo.seedId, bestNo.name, 36)} ${bestNo.name}`;
        document.getElementById('noFertExpH').textContent = bestNo.expPerHourNoFert.toFixed(2);
        document.getElementById('noFertExpD').textContent = Math.round(bestNo.expPerDayNoFert).toLocaleString();
        document.getElementById('noFertGrow').textContent = bestNo.growTimeStr;
        document.getElementById('noFertLv').textContent = `Lv ${bestNo.requiredLevel}`;
    } else {
        document.getElementById('cardNoFert').style.display = 'none';
    }

    // 渲染施肥推荐
    if (useFert && !useOrganic) {
        const cardFert = document.getElementById('cardFert');
        cardFert.style.display = '';
        cardFert.classList.add('fade-in');
        document.getElementById('fertName').innerHTML = `${getCropImage(bestFert.seedId, bestFert.name, 36)} ${bestFert.name}`;
        document.getElementById('fertExpH').textContent = bestFert.expPerHourFert.toFixed(2);
        document.getElementById('fertExpD').textContent = Math.round(bestFert.expPerDayFert).toLocaleString();
        document.getElementById('fertGrow').textContent = bestFert.growTimeFertStr;
        document.getElementById('fertGain').textContent = `+${bestFert.gainPercent.toFixed(2)}%`;
    } else {
        document.getElementById('cardFert').style.display = 'none';
    }

    // 渲染有机肥推荐
    if (useOrganic) {
        const cardOrganic = document.getElementById('cardOrganic');
        const organicSupportSec = estimateOrganicSupportSec(bestOrganic, organicReduceSec);
        cardOrganic.style.display = '';
        cardOrganic.classList.add('fade-in');
        document.getElementById('organicName').innerHTML = `${getCropImage(bestOrganic.seedId, bestOrganic.name, 36)} ${bestOrganic.name}`;
        document.getElementById('organicExpH').textContent = bestOrganic.expPerHourOrganic.toFixed(2);
        document.getElementById('organicExpD').textContent = Math.round(bestOrganic.expPerDayOrganic).toLocaleString();
        document.getElementById('organicGrow').textContent = bestOrganic.growTimeOrganicStr;
        document.getElementById('organicGain').textContent = `+${bestOrganic.organicGainPercent.toFixed(2)}%`;
        document.getElementById('organicSupport').textContent = formatDuration(organicSupportSec);
    } else {
        document.getElementById('cardOrganic').style.display = 'none';
    }

    // 渲染进度条对比（Top 5）
    renderProgressBars(sortedNoFert, sortedFert, sortedOrganic, useFert, useOrganic);

    setRankingModeVisibility(useOrganic);
    // 渲染排行榜
    renderRanking();

    // 提示计算完成
    const fertText = useFert ? '开启' : '关闭';
    const plantSecNo = (lands / NO_FERT_PLANT_SPEED).toFixed(1);
    const plantSecFert = (lands / NORMAL_FERT_PLANT_SPEED).toFixed(1);
    let msg = `📋 计算条件：Lv${level} · ${lands}块地 · 肥料${fertText}\n`;
    msg += `⏱️ 种植速度：不施肥 ${NO_FERT_PLANTS_PER_2_SEC}块/2秒，施肥 ${NORMAL_FERT_PLANTS_PER_2_SEC}块/2秒\n`;
    msg += `🏡 整场种完：不施肥 ${plantSecNo}秒，施肥 ${plantSecFert}秒\n`;
    msg += `🧪 肥料效果：减少一个生长阶段；每次施肥每块地增加 100ms 操作间隔\n`;
    if (useOrganic) {
        const organicSupportSec = estimateOrganicSupportSec(bestOrganic, organicReduceSec);
        msg += `🌿 有机肥：额外扣时 ${organicMinutes} 分钟（在普通肥后生效，按阶段重复施肥）\n`;
        msg += `📏 对比口径：同样单位时间内，仅比较“都使用有机肥”时各作物效率\n`;
        msg += `⌛ 当前有机肥预计可持续操作：${formatDuration(organicSupportSec)}\n`;
    }
    msg += `📊 共分析 ${calculatedRows.length} 种可用作物\n`;
    if (useOrganic) {
        msg += `\n🌿 有机肥最优：${getCropEmoji(bestOrganic.name)} ${bestOrganic.name}（${bestOrganic.expPerHourOrganic.toFixed(2)} exp/h · 相对普通肥 ↑${bestOrganic.organicGainPercent.toFixed(1)}% · 有机肥约 ${bestOrganic.organicUseCount} 次/轮）`;
    } else {
        msg += `🌾 不施肥最优：${getCropEmoji(bestNo.name)} ${bestNo.name}（${bestNo.expPerHourNoFert.toFixed(2)} exp/h）`;
        if (useFert) {
            msg += `\n🧪 施肥最优：${getCropEmoji(bestFert.name)} ${bestFert.name}（${bestFert.expPerHourFert.toFixed(2)} exp/h · ↑${bestFert.gainPercent.toFixed(1)}%）`;
        }
    }
    msg += `\n⚠️ 多季作物的计算方式暂未确定，结果仅供参考`;
    showToast(msg);

    // 土地升级推荐
    renderUpgradePlan(level, lands);
}

// ========== 土地升级推荐 ==========
// 从真实 lands 表里查某类型第 N 块（slotIdx 从 0 起）的升级成本
function getLandUpgradeCost(typeId, slotIdx, landTable) {
    const slot = slotIdx + 1; // slotIdx 从 0 开始，slot 从 1 开始
    const slotData = landTable && landTable[String(slot)];
    if (!slotData || !slotData[typeId]) return null;
    const c = slotData[typeId];
    return {
        slot,
        level: c.level || 0,
        goldW: c.gold_w || 0,
        jindou: c.jindou || 0
    };
}

function renderUpgradePlan(level, totalLands) {
    const el = document.getElementById('cardUpgradePlan');
    if (!el) return;

    // 使用真实24块地数据
    const landTable = window.__landTable;
    if (!landTable) {
        el.style.display = 'none';
        return;
    }

    const goldW = Math.max(0, parseInt(document.getElementById('inputGoldW').value) || 0);
    const jindou = Math.max(0, parseInt(document.getElementById('inputJindou').value) || 0);
    const cfg = landConfig;

    // 每种土地类型对应的"下一块待升级"
    // 优先级：紫晶 > 金 > 黑 > 红 > 普通
    const priority = ['amethyst', 'gold', 'black', 'red', 'normal'];
    const plan = [];
    for (const t of priority) {
        const have = cfg[t] || 0;
        if (have >= totalLands) continue;
        const cost = getLandUpgradeCost(t, have, landTable);
        if (!cost) continue;
        plan.push({
            typeId: t,
            slotIdx: have,
            ...cost
        });
    }

    const html = [];
    html.push(`<div class="upgrade-plan-header">`);
    html.push(`<h3 class="card-title">🆙 土地升级推荐</h3>`);
    html.push(`<p class="upgrade-plan-meta">当前 Lv${level} · 金币 <b>${goldW.toLocaleString()}</b> 万 · 金豆豆 <b>${jindou.toLocaleString()}</b></p>`);
    html.push(`</div>`);

    if (plan.length === 0) {
        html.push(`<p class="upgrade-plan-empty">所有土地都已是最高级 🎉</p>`);
    } else {
        // 排序：高级土地优先
        plan.sort((a, b) => {
            const order = { amethyst: 0, gold: 1, black: 2, red: 3, normal: 4 };
            return order[a.typeId] - order[b.typeId] || a.level - b.level;
        });
        html.push(`<div class="upgrade-plan-list">`);
        for (const p of plan) {
            const typeMeta = (landTypeData.find(t => t.id === p.typeId) || {});
            const canLevel = level >= p.level;
            const canGold = goldW >= p.goldW;
            const canJindou = jindou >= p.jindou;
            const can = canLevel && canGold && canJindou;
            const cls = can ? 'can' : (canLevel ? 'cant-gold' : 'cant-level');
            const badge = p.typeId === 'amethyst' ? '紫' : p.typeId === 'gold' ? '金' : p.typeId === 'black' ? '黑' : p.typeId === 'red' ? '红' : '普';
            const badgeClass = p.typeId;
            html.push(`<div class="upgrade-row ${cls}">`);
            html.push(`<span class="land-type-badge ${badgeClass}">${badge}</span>`);
            html.push(`<div class="upgrade-row-info">`);
            html.push(`<div class="upgrade-row-title">${typeMeta.name || p.typeId} · 地块 #${p.slot}</div>`);
            html.push(`<div class="upgrade-row-cond">`);
            if (!canLevel) html.push(`<span class="cond fail">等级 ${p.level}（差 ${p.level - level}）</span>`);
            else html.push(`<span class="cond ok">等级 ${p.level} ✓</span>`);
            html.push(`<span class="cond ${canGold ? 'ok' : 'fail'}">金币 ${p.goldW.toLocaleString()} 万 ${canGold ? '✓' : `（差 ${(p.goldW - goldW).toLocaleString()}）`}</span>`);
            if (p.jindou > 0) {
                html.push(`<span class="cond ${canJindou ? 'ok' : 'fail'}">金豆 ${p.jindou} ${canJindou ? '✓' : `（差 ${p.jindou - jindou}）`}</span>`);
            }
            html.push(`</div>`);
            html.push(`</div>`);
            html.push(can ? `<span class="upgrade-row-tag ok">可升级</span>` : `<span class="upgrade-row-tag fail">不可</span>`);
            html.push(`</div>`);
        }
        html.push(`</div>`);
        html.push(`<p class="upgrade-plan-tip">💡 优先升级高级土地（紫晶>金>黑>红>普通），产量和经验加成更高。数据来自游戏内土地扩建面板截图，2026-07-22。</p>`);
    }

    el.innerHTML = html.join('');
    el.style.display = '';
    el.classList.add('fade-in');
}

// ========== 进度条 ==========
function renderProgressBars(sortedNoFert, sortedFert, sortedOrganic, useFert, useOrganic) {
    const container = document.getElementById('progressBars');
    const card = document.getElementById('cardProgress');
    card.style.display = '';
    card.classList.add('fade-in');

    const colors = ['fill-green', 'fill-orange', 'fill-purple', 'fill-blue', 'fill-pink'];

    function buildGroup(title, list, key) {
        const top5 = list.slice(0, 5);
        const maxExp = top5[0] ? top5[0][key] : 1;
        let html = `<div class="progress-group-title">${title}</div>`;
        top5.forEach((r, i) => {
            const exp = r[key];
            const pct = (exp / maxExp * 100).toFixed(1);
            html += `
            <div class="progress-row">
                <span class="progress-label">${getCropImage(r.seedId, r.name, 24)} ${r.name}</span>
                <div class="progress-track">
                    <div class="progress-fill ${colors[i]}" style="width: ${pct}%">${pct}%</div>
                </div>
                <span class="progress-value">${exp.toFixed(2)} /h</span>
            </div>`;
        });
        return html;
    }

    let html = '';
    if (useOrganic) {
        html = buildGroup('🌿 有机肥 Top 5（同样单位时间）', sortedOrganic, 'expPerHourOrganic');
    } else {
        html = buildGroup('🌾 不施肥 Top 5', sortedNoFert, 'expPerHourNoFert');
        if (useFert) {
            html += `<div class="progress-divider"></div>`;
            html += buildGroup('🧪 施肥 Top 5', sortedFert, 'expPerHourFert');
        }
    }
    container.innerHTML = html;
}

// ========== 排行榜 ==========
function switchRankTab(tab, btn) {
    currentRankTab = tab;
    document.querySelectorAll('.clay-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderRanking();
}

function renderRanking() {
    const body = document.getElementById('rankingBody');
    let key = 'expPerHourNoFert';
    if (currentRankTab === 'fert') key = 'expPerHourFert';
    if (currentRankTab === 'organic') key = 'expPerHourOrganic';
    const sorted = [...calculatedRows].sort((a, b) => b[key] - a[key]).slice(0, 20);
    const maxExp = sorted[0] ? sorted[0][key] : 1;

    if (sorted.length === 0) {
        body.innerHTML = `
        <div class="ranking-empty">
            <div style="font-size:2.5rem;margin-bottom:12px;">🏆</div>
            <p style="color:#a08d7d;font-size:0.95rem;">请先进行经验计算<br>排行榜将根据计算结果生成</p>
        </div>`;
        return;
    }

    let html = '';
    sorted.forEach((r, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const exp = r[key];
        const pct = (exp / maxExp * 100).toFixed(1);
        let growStr = r.growTimeStr;
        if (currentRankTab === 'fert') growStr = r.growTimeFertStr;
        if (currentRankTab === 'organic') growStr = r.growTimeOrganicStr;

        html += `
        <div class="ranking-row">
            <span class="rank-num ${rankClass}">${medal}</span>
            <span class="rank-name">${getCropImage(r.seedId, r.name, 24)} ${r.name}</span>
            <span class="rank-level">Lv${r.requiredLevel}</span>
            <span class="rank-grow">${growStr}</span>
            <span class="rank-exp">${exp.toFixed(2)}</span>
            <div class="rank-bar-wrap"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    });
    body.innerHTML = html;
}

// ========== 作物图鉴 ==========
function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    const search = (document.getElementById('catalogSearch').value || '').trim().toLowerCase();
    const seasonFilter = document.getElementById('catalogSeason').value;

    let items = seedData.filter(s => {
        const name = (s.name || '').toLowerCase();
        if (search && !name.includes(search)) return false;
        if (seasonFilter !== 'all' && String(s.seasons) !== seasonFilter) return false;
        return true;
    });

    let html = '';
    items.forEach(s => {
        const name = s.name || '';
        const emoji = getCropEmoji(name);
        const seasons = Number(s.seasons) || 1;
        const seasonText = seasons === 1 ? '一季' : '二季';

        const seedId = Number(s.seedId) || 0;
        html += `
        <div class="catalog-item">
            <div class="catalog-emoji">${getCropImage(seedId, name, 48)}</div>
            <div class="catalog-name">${name}</div>
            <div class="catalog-meta">
                <span class="catalog-tag">Lv ${s.requiredLevel}</span>
                <span class="catalog-tag tag-season">${seasonText}</span>
                <span class="catalog-tag tag-price">💰 ${s.price}</span>
            </div>
            <div class="catalog-detail">
                <strong>经验:</strong> ${s.exp} &nbsp;
                <strong>生长:</strong> ${s.growTimeStr || formatSec(s.growTimeSec)}<br>
                <strong>产量:</strong> ${s.fruitCount || '-'}
            </div>
        </div>`;
    });

    grid.innerHTML = html || '<p style="text-align:center;color:#a08d7d;grid-column:1/-1;">没有找到匹配的作物</p>';
}

function filterCatalog() {
    renderCatalog();
}

// ========== Toast 提示框 ==========
function showToast(message) {
    // 移除已有的 toast
    const old = document.querySelector('.clay-toast-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'clay-toast-overlay';

    const toast = document.createElement('div');
    toast.className = 'clay-toast';

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = '🎉';

    const title = document.createElement('div');
    title.className = 'toast-title';
    title.textContent = '计算完成';

    const msg = document.createElement('div');
    msg.className = 'toast-message';
    msg.innerHTML = message.replace(/\n/g, '<br>');

    const btn = document.createElement('button');
    btn.className = 'toast-btn';
    btn.textContent = '🌟 太棒了！';
    btn.onclick = () => {
        toast.classList.add('toast-out');
        overlay.classList.add('overlay-out');
        setTimeout(() => overlay.remove(), 300);
    };

    toast.appendChild(icon);
    toast.appendChild(title);
    toast.appendChild(msg);
    toast.appendChild(btn);
    overlay.appendChild(toast);
    document.body.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            toast.classList.add('toast-out');
            overlay.classList.add('overlay-out');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', init);
