/* waveguide.js — SiN波导色散工具 (phys-4 物理模型)
 * 支持宽度+波长双维度查询，点线面三种模式
 * 模型: neff(w,f) = 幂律约束 + 色散交叉项
 */

const PHYS4_COEFF = {
    A:  1.369671058718986,
    B:  7.718322227769457e-4,
    C:  3.872468186464330e-6,
    D: -1.117477461649246e-8,
    E: -5.722607498209106e-2,
    F:  4.385147533694086e-2,
    G:  4.834332610997406e-2,
    H: -7.152200321307409e-4,
    I:  4.416301905375029e-6,
    J: -7.479663144627437e-4
};

const C_LIGHT = 299792458;

const AEFF_W = [0.8,0.9,1.0,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2.0,
                2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0];
const AEFF_V = [0.9082,0.8020,0.7428,0.7101,0.6935,0.6874,0.6887,
                0.6951,0.7053,0.7184,0.7337,0.7508,0.7693,
                0.8755,0.9944,1.119,1.248,1.378,1.510,1.643,
                1.776,1.910,2.044];

function lambdaToFreq(nm) { return C_LIGHT/(nm*1e-9)/1e12; }

function neffPhys4(w, f) {
    const c = PHYS4_COEFF;
    return c.A + c.B*f + c.C*f*f + c.D*f*f*f
         + c.E/w + c.F/(w*w) + c.G/(w*w*w)
         + c.H*f/w + c.I*f*f/w + c.J*f/(w*w);
}

function dneffDf(w, f) {
    const c = PHYS4_COEFF;
    return c.B + 2*c.C*f + 3*c.D*f*f + c.H/w + 2*c.I*f/w + c.J/(w*w);
}

function d2neffDf2(w, f) { return 2*PHYS4_COEFF.C + 6*PHYS4_COEFF.D*f + 2*PHYS4_COEFF.I/w; }

function ngPhys4(w, f) { return neffPhys4(w,f) + f*dneffDf(w,f); }

function beta2Phys4(w, f) {
    const dndf = dneffDf(w,f), d2 = d2neffDf2(w,f);
    return (2*dndf + f*d2)/(2*Math.PI*C_LIGHT) * 1e27;
}

function aeffInterp(w) {
    if (w<=AEFF_W[0]) return AEFF_V[0];
    if (w>=AEFF_W[22]) return AEFF_V[22];
    let i=0; while(i<22 && AEFF_W[i+1]<w) i++;
    const t=(w-AEFF_W[i])/(AEFF_W[i+1]-AEFF_W[i]);
    return AEFF_V[i]+t*(AEFF_V[i+1]-AEFF_V[i]);
}

function computeAll(wUm, lNm) {
    const f = lambdaToFreq(lNm);
    return {neff:neffPhys4(wUm,f), ng:ngPhys4(wUm,f),
            beta2:beta2Phys4(wUm,f), aeff:aeffInterp(wUm),
            freqThz:f, widthUm:wUm, lambdaNm:lNm};
}

function neffSpectrum(wUm, lArr) { return lArr.map(l=>neffPhys4(wUm,lambdaToFreq(l))); }
function ngSpectrum(wUm, lArr)   { return lArr.map(l=>ngPhys4(wUm,lambdaToFreq(l))); }
function beta2Spectrum(wUm,lArr) { return lArr.map(l=>beta2Phys4(wUm,lambdaToFreq(l))); }

function neffGrid(wGrid, lGrid) {
    const g=[]; for(let i=0;i<wGrid.length;i++){
        g[i]=[]; for(let j=0;j<lGrid.length;j++) g[i][j]=neffPhys4(wGrid[i],lambdaToFreq(lGrid[j]));
    } return g;
}