% plot_sin_neff.m — neff + Aeff paired fundamental mode extraction & fit
clear; close all;

%% 1. Read CSV (all 4 columns)
fprintf('Reading CSV...\n');
opts = detectImportOptions('SiN折射率分布.csv', 'NumHeaderLines',0,'VariableNamingRule','preserve');
opts.DataLines = [6, Inf];
opts.VariableNames = {'width_um','freq_hz','neff_complex','aeff_raw'};
opts.SelectedVariableNames = {'width_um','freq_hz','neff_complex','aeff_raw'};
data = readtable('SiN折射率分布.csv', opts);
fprintf('Loaded: %d rows\n', height(data));

%% 2. Parse complex neff
fprintf('Parsing neff...\n');
neff_str = string(data.neff_complex);
n_rows = length(neff_str);
neff_real = zeros(n_rows,1); neff_imag = zeros(n_rows,1);
for i = 1:n_rows
    s = char(neff_str(i));
    tokens = regexp(s, '^([\d\.]+(?:E[+\-]\d+)?)([+\-][\d\.]+(?:E[+\-]\d+)?)i$', 'tokens');
    if ~isempty(tokens)
        neff_real(i) = str2double(tokens{1}{1});
        neff_imag(i) = str2double(tokens{1}{2});
    else
        neff_real(i) = str2double(s); neff_imag(i) = 0;
    end
end
fprintf('neff real: [%.6f, %.6f]\n', min(neff_real), max(neff_real));

%% 3. Paired fundamental mode: max(neff_real) row → Aeff from same row
fprintf('Grouping fundamental mode (paired)...\n');
widths = data.width_um; freqs = data.freq_hz; aeff_vals = data.aeff_raw;
[uw,~,~] = unique(widths); [uf,~,~] = unique(freqs);
nw = length(uw); nf = length(uf);
neff_grid = zeros(nw,nf); aeff_grid = zeros(nw,nf);
for i = 1:nw
    for j = 1:nf
        mask = (widths==uw(i)) & (freqs==uf(j));
        if any(mask)
            [neff_grid(i,j), idx] = max(neff_real(mask));
            ae_rows = find(mask);
            aeff_grid(i,j) = aeff_vals(ae_rows(idx));
        else
            neff_grid(i,j) = NaN; aeff_grid(i,j) = NaN;
        end
    end
end
neff_grid = real(neff_grid);
fprintf('Grid: %d w x %d f. Aeff range: [%.4e, %.4e] m2\n', nw, nf, min(aeff_grid(:)), max(aeff_grid(:)));

freq_thz = uf/1e12; width_um = uw;
[F, W] = meshgrid(freq_thz, width_um);

%% 4. Pseudocolor plots
figure('Position',[100 100 900 650]);
pcolor(F, W, neff_grid); shading interp; colormap(jet(256));
colorbar; xlabel('f (THz)'); ylabel('w (\mum)'); title('neff fundamental mode');
set(gca,'FontSize',12,'Layer','top'); box on;
saveas(gcf,'sin_neff_distribution.png'); savefig(gcf,'sin_neff_distribution.fig');

figure('Position',[100 100 900 650]);
pcolor(F, W, aeff_grid*1e12); shading interp; colormap(jet(256));
colorbar; xlabel('f (THz)'); ylabel('w (\mum)'); title('Aeff (x10^{-12} m^2) fundamental mode');
set(gca,'FontSize',12,'Layer','top'); box on;
saveas(gcf,'sin_aeff_distribution.png'); savefig(gcf,'sin_aeff_distribution.fig');

%% 5. neff fit (phys-4)
fprintf('\n===== neff phys-4 fit =====\n');
zn = neff_grid(:); vn = ~isnan(zn);
xf = F(:); yf = W(:);
xn = xf(vn); yn = yf(vn); zn = zn(vn);

ft_phys4 = fittype(@(A,B,C,D,E,F,G,H,I,J, w, f) ...
    A + B*f + C*f.^2 + D*f.^3 + E./w + F./w.^2 + G./w.^3 + H*f./w + I*f.^2./w + J*f./w.^2, ...
    'independent',{'w','f'},'dependent','z');
opts = fitoptions(ft_phys4);
opts.StartPoint = [1.2,0.001,0,0,0.2,-0.1,0.01,0,0,0];
[fit_neff, gof_neff] = fit([yn,xn], zn, ft_phys4, opts);
fprintf('R2=%.6f RMSE=%.6f\n', gof_neff.rsquare, gof_neff.rmse);
disp(fit_neff);

%% 6. Aeff fit (physics-inspired)
fprintf('\n===== Aeff fit =====\n');
za = aeff_grid(:);
xa = xf(vn); ya = yf(vn); za = za(vn);

% Aeff fit: poly44 with centered frequency fc = f - 195
fc_a = xa - 195;
[fit_aeff, gof_aeff] = fit([fc_a, ya], za, 'poly44');
fprintf('R2=%.6f RMSE=%.4e\n', gof_aeff.rsquare, gof_aeff.rmse);
disp(fit_aeff);

%% 7. Fine grid prediction
fprintf('\n===== Fine grid =====\n');
w_fine = (0.8:0.05:1.5)'; f_fine = (180:1:210)';
[F_fine, W_fine] = meshgrid(f_fine, w_fine);

Znf = reshape(feval(fit_neff, W_fine(:), F_fine(:)), length(w_fine), length(f_fine));
Zaf = reshape(feval(fit_aeff, F_fine(:)-195, W_fine(:))*1e12, length(w_fine), length(f_fine));

figure('Position',[100 100 900 650]);
pcolor(F_fine, W_fine, Znf); shading interp; colormap(jet(256)); colorbar;
xlabel('f (THz)'); ylabel('w (\mum)');
title(sprintf('neff fine grid (R2=%.6f)', gof_neff.rsquare));
saveas(gcf,'sin_neff_fitted_fine.png'); savefig(gcf,'sin_neff_fitted_fine.fig');

figure('Position',[100 100 900 650]);
pcolor(F_fine, W_fine, Zaf); shading interp; colormap(jet(256)); colorbar;
xlabel('f (THz)'); ylabel('w (\mum)');
title(sprintf('Aeff fine grid (R2=%.6f)', gof_aeff.rsquare));
saveas(gcf,'sin_aeff_fitted_fine.png'); savefig(gcf,'sin_aeff_fitted_fine.fig');

%% 8. Residuals
figure('Position',[150 150 800 500]);
subplot(1,2,1); histogram(zn-feval(fit_neff,yn,xn),80);
xlabel('\Delta n_{eff}'); title('neff residuals'); grid on;
subplot(1,2,2); histogram(za-feval(fit_aeff,ya,xa),80);
xlabel('\Delta Aeff (m^2)'); title('Aeff residuals'); grid on;
saveas(gcf,'sin_residuals.png'); savefig(gcf,'sin_residuals.fig');

%% 9. Save
save('neff_fit_result.mat','fit_neff','fit_aeff','gof_neff','gof_aeff',...
     'w_fine','f_fine','Znf','Zaf','freq_thz','width_um','neff_grid','aeff_grid');
fprintf('\nSaved neff_fit_result.mat\n');

%% 10. Key values at 1550nm
fprintf('\n=== 1550nm (193.414 THz) ===\n');
f1550 = 299792458/(1550e-9)/1e12;
for wv = [1.2, 1.4, 1.5]
    fprintf('w=%.6f um: neff=%.6f  Aeff=%.6f x10^-12 m2\n', ...
        wv, feval(fit_neff,wv,f1550), feval(fit_aeff,f1550-195,wv)*1e12);
end
fprintf('\n======== DONE ========\n');