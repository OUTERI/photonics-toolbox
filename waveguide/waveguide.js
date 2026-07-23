/* waveguide.js — SiN波导色散工具 (phys-4 neff + poly44 Aeff)
 * 支持宽度+波长双维度查询，点线面三种模式
 */

const PHYS4_COEFF = {
    A:  1.369671058718986e+00,
    B:  7.718322227769457e-04,
    C:  3.872468186464330e-06,
    D: -1.117477461649246e-08,
    E: -5.722607498209106e-02,
    F:  4.385147533694086e-02,
    G:  4.834332610997406e-02,
    H: -7.152200321307409e-04,
    I:  4.416301905375029e-06,
    J: -7.479663144627437e-04
};

/* Aeff poly44 系数 (x=fc=f-195 THz, y=w um, z=Aeff m2) */
const AEFF_COEFF = [
     1.428802636594751e-12,  // p00
    -3.396259912828164e-14,  // p10
    -1.135182089550820e-12,  // p01
     4.311116390888632e-16,  // p20
     2.343493388416865e-14,  // p11
     5.442019815252612e-13,  // p02
    -4.220577594816431e-18,  // p30
    -1.847308205045851e-16,  // p21
    -6.252084189004097e-15,  // p12
    -8.737443012445691e-14,  // p03
     3.479874210155030e-20,  // p40
     6.288304018153547e-19,  // p31
     2.202217344159885e-17,  // p22
     4.652348634145752e-16,  // p13
     4.934030741925020e-15   // p04
];

const C_LIGHT = 299792458;

function lambdaToFreq(nm) { return C_LIGHT / (nm * 1e-9) / 1e12; }

/* ---- neff phys-4 ---- */
function neffPhys4(w, f) {
    var c = PHYS4_COEFF;
    return c.A + c.B*f + c.C*f*f + c.D*f*f*f
         + c.E/w + c.F/(w*w) + c.G/(w*w*w)
         + c.H*f/w + c.I*f*f/w + c.J*f/(w*w);
}

function dneffDf(w, f) {
    var c = PHYS4_COEFF;
    return c.B + 2*c.C*f + 3*c.D*f*f + c.H/w + 2*c.I*f/w + c.J/(w*w);
}

function d2neffDf2(w, f) { return 2*PHYS4_COEFF.C + 6*PHYS4_COEFF.D*f + 2*PHYS4_COEFF.I/w; }

function ngPhys4(w, f) { return neffPhys4(w, f) + f * dneffDf(w, f); }

function beta2Phys4(w, f) {
    var dndf = dneffDf(w, f), d2 = d2neffDf2(w, f);
    return 1e15 * (2*dndf + f*d2) / (2 * Math.PI * C_LIGHT);
}

/* ---- Aeff poly44 (fc = f - 195) ---- */
function aeffPoly44(w, f) {
    var fc = f - 195, c = AEFF_COEFF;
    var w2 = w*w, w3 = w2*w, w4 = w3*w;
    var fc2 = fc*fc, fc3 = fc2*fc, fc4 = fc3*fc;
    return c[0] + c[1]*fc + c[2]*w + c[3]*fc2 + c[4]*fc*w + c[5]*w2
         + c[6]*fc3 + c[7]*fc2*w + c[8]*fc*w2 + c[9]*w3
         + c[10]*fc4 + c[11]*fc3*w + c[12]*fc2*w2 + c[13]*fc*w3 + c[14]*w4;
}

function computeAll(wUm, lNm) {
    var f = lambdaToFreq(lNm);
    return {
        neff:    neffPhys4(wUm, f),
        ng:      ngPhys4(wUm, f),
        beta2:   beta2Phys4(wUm, f),
        aeff:    aeffPoly44(wUm, f),
        freqThz: f,
        widthUm: wUm,
        lambdaNm: lNm
    };
}

function neffSpectrum(wUm, lArr)  { return lArr.map(function(l) { return neffPhys4(wUm, lambdaToFreq(l)); }); }
function ngSpectrum(wUm, lArr)    { return lArr.map(function(l) { return ngPhys4(wUm, lambdaToFreq(l)); }); }
function beta2Spectrum(wUm, lArr) { return lArr.map(function(l) { return beta2Phys4(wUm, lambdaToFreq(l)); }); }
function aeffSpectrum(wUm, lArr)  { return lArr.map(function(l) { return aeffPoly44(wUm, lambdaToFreq(l)); }); }

function neffGrid(wGrid, lGrid) {
    var g = [];
    for (var i = 0; i < wGrid.length; i++) {
        g[i] = [];
        for (var j = 0; j < lGrid.length; j++)
            g[i][j] = neffPhys4(wGrid[i], lambdaToFreq(lGrid[j]));
    }
    return g;
}