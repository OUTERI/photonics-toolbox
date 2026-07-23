% plot_sin_neff.m
% 读取 COMSOL 导出的 SiN 折射率分布 CSV，绘制伪彩图
% 使用 phys-4 物理模型: neff(w,f) = 幂律约束 + 色散交叉项
% 横轴：频率，纵轴：波导宽度，颜色：有效折射率实部

clear; close all;

%% 1. 读取 CSV 数据
fprintf('正在读取 CSV 文件...\n');

opts = detectImportOptions('SiN折射率分布.csv', ...
    'NumHeaderLines', 0, 'VariableNamingRule', 'preserve');
opts.DataLines = [6, Inf];
opts.VariableNames = {'width_um', 'freq_hz', 'neff_complex', 'extra'};
opts.SelectedVariableNames = {'width_um', 'freq_hz', 'neff_complex'};

data = readtable('SiN折射率分布.csv', opts);
fprintf('读取完成，共 %d 行数据\n', height(data));

%% 2. 解析复数折射率
fprintf('正在解析复数折射率...\n');

neff_str = string(data.neff_complex);
n_rows = length(neff_str);
neff_real = zeros(n_rows, 1);
neff_imag = zeros(n_rows, 1);

for i = 1:n_rows
    s = char(neff_str(i));
    tokens = regexp(s, '^([\d\.]+(?:E[+\-]\d+)?)([+\-][\d\.]+(?:E[+\-]\d+)?)i$', 'tokens');
    if ~isempty(tokens)
        neff_real(i) = str2double(tokens{1}{1});
        neff_imag(i) = str2double(tokens{1}{2});
    else
        neff_real(i) = str2double(s);
        neff_imag(i) = 0;
    end
end

fprintf('解析完成：neff 实部范围 [%.6f, %.6f]\n', min(neff_real), max(neff_real));
fprintf('          neff 虚部范围 [%.2e, %.2e]\n', min(neff_imag), max(neff_imag));

%% 3. 按 (width, freq) 分组，取基模（max real(neff)）
fprintf('正在分组取基模...\n');

widths = data.width_um;
freqs = data.freq_hz;
[uw, ~, ~] = unique(widths);
[uf, ~, ~] = unique(freqs);
nw = length(uw);
nf = length(uf);

neff_grid = zeros(nw, nf);
for i = 1:nw
    for j = 1:nf
        mask = (widths == uw(i)) & (freqs == uf(j));
        if any(mask)
            neff_grid(i, j) = max(neff_real(mask));
        else
            neff_grid(i, j) = NaN;
        end
    end
end
neff_grid = real(neff_grid);
fprintf('分组完成：%d 个宽度 x %d 个频率 = %d 个网格点\n', nw, nf, nw*nf);
fprintf('有效网格点数：%d\n', sum(~isnan(neff_grid(:))));

freq_thz = uf / 1e12;
width_um = uw;

%% 4. 绘制伪彩图
fprintf('正在绘制伪彩图...\n');

figure('Position', [100, 100, 900, 650]);
[F, W] = meshgrid(freq_thz, width_um);
pcolor(F, W, neff_grid);
shading interp;
colormap(jet(256));

cb = colorbar;
cb.Label.String = '有效折射率实部 Re(n_{eff})';
cb.Label.FontSize = 13;

xlabel('频率 f (THz)', 'FontSize', 13);
ylabel('波导宽度 w (\mum)', 'FontSize', 13);
title('SiN 波导有效折射率分布（基模）', 'FontSize', 15);

set(gca, 'FontSize', 12);
set(gca, 'Layer', 'top');
box on;

hold on;
[min_val, min_idx] = min(neff_grid(:));
[max_val, max_idx] = max(neff_grid(:));
[min_wi, min_fi] = ind2sub([nw, nf], min_idx);
[max_wi, max_fi] = ind2sub([nw, nf], max_idx);
plot(freq_thz(min_fi), width_um(min_wi), 'wo', 'MarkerSize', 10, 'MarkerFaceColor', 'k', ...
    'DisplayName', sprintf('Min: %.6f', min_val));
plot(freq_thz(max_fi), width_um(max_wi), 'w^', 'MarkerSize', 10, 'MarkerFaceColor', 'k', ...
    'DisplayName', sprintf('Max: %.6f', max_val));
legend('Location', 'southeast', 'FontSize', 11);
hold off;

fprintf('\n--- 结果摘要 ---\n');
fprintf('最小 neff = %.6f @ w = %.6f um, f = %.6f THz\n', ...
    min_val, width_um(min_wi), freq_thz(min_fi));
fprintf('最大 neff = %.6f @ w = %.6f um, f = %.6f THz\n', ...
    max_val, width_um(max_wi), freq_thz(max_fi));

saveas(gcf, 'sin_neff_distribution.png');
savefig(gcf, 'sin_neff_distribution.fig');
fprintf('\n图形已保存为 sin_neff_distribution.png 和 .fig\n');

save('neff_grid_data.mat', 'uw', 'uf', 'freq_thz', 'width_um', 'neff_grid');
fprintf('数据已保存为 neff_grid_data.mat\n\n');

%% 5. phys-4 物理模型拟合
fprintf('===== phys-4: 幂律约束 + 色散交叉项 =====\n');

[F_mesh, W_mesh] = meshgrid(freq_thz, width_um);
x_fit = F_mesh(:);
y_fit = W_mesh(:);
z_fit = neff_grid(:);

valid = ~isnan(z_fit);
x_fit = x_fit(valid);
y_fit = y_fit(valid);
z_fit = z_fit(valid);

fprintf('拟合数据点数：%d\n', length(x_fit));

ft_phys4 = fittype(@(A,B,C,D,E,F,G,H,I,J, w, f) ...
    A + B*f + C*f.^2 + D*f.^3 + E./w + F./w.^2 + G./w.^3 + H*f./w + I*f.^2./w + J*f./w.^2, ...
    'independent', {'w', 'f'}, 'dependent', 'z', ...
    'coefficients', {'A','B','C','D','E','F','G','H','I','J'});

opts = fitoptions(ft_phys4);
opts.StartPoint = [1.2, 0.001, 0, 0, 0.2, -0.1, 0.01, 0, 0, 0];

[fit_result, gof] = fit([y_fit, x_fit], z_fit, ft_phys4, opts);
fit_type = 'feval_wf';

fprintf('  R2 = %.6f\n', gof.rsquare);
fprintf('  Adj R2 = %.6f\n', gof.adjrsquare);
fprintf('  RMSE = %.6f\n', gof.rmse);

fprintf('\n拟合公式: neff(w,f) = A + B*f + C*f^2 + D*f^3\n');
fprintf('                      + E/w + F/w^2 + G/w^3\n');
fprintf('                      + H*f/w + I*f^2/w + J*f/w^2\n\n');
disp(fit_result);

z_pred_all = feval(fit_result, y_fit, x_fit);
rmse_all = sqrt(mean((z_fit - z_pred_all).^2));
r2_all = 1 - sum((z_fit-z_pred_all).^2)/sum((z_fit-mean(z_fit)).^2);
fprintf('全数据 RMSE = %.6f, R2 = %.6f\n\n', rmse_all, r2_all);

%% 6. 精细网格预测
fprintf('===== 精细网格预测 =====\n');

w_fine = (0.8:0.05:1.5)';
f_fine = (180:1:210)';

[F_fine, W_fine] = meshgrid(f_fine, w_fine);
nw_fine = length(w_fine);
nf_fine = length(f_fine);

fprintf('精细网格：%d 宽度 x %d 频率 = %d 点\n', nw_fine, nf_fine, nw_fine*nf_fine);
fprintf('宽度范围：%.6f ~ %.6f um (步长 %.6f)\n', w_fine(1), w_fine(end), w_fine(2)-w_fine(1));
fprintf('频率范围：%d ~ %d THz (步长 %d)\n', f_fine(1), f_fine(end), f_fine(2)-f_fine(1));

Z_fine = feval(fit_result, W_fine(:), F_fine(:));
Z_fine = reshape(Z_fine, nw_fine, nf_fine);

fprintf('预测 neff 范围：[%.6f, %.6f]\n\n', min(Z_fine(:)), max(Z_fine(:)));

%% 7. 精细网格伪彩图
figure('Position', [100, 100, 900, 650]);
pcolor(F_fine, W_fine, Z_fine);
shading interp;
colormap(jet(256));

cb = colorbar;
cb.Label.String = '有效折射率实部 Re(n_{eff})';
cb.Label.FontSize = 13;

xlabel('频率 f (THz)', 'FontSize', 13);
ylabel('波导宽度 w (\mum)', 'FontSize', 13);
title(sprintf('SiN 有效折射率拟合 (phys-4, R2=%.6f, RMSE=%.6f)', r2_all, rmse_all), 'FontSize', 14);

set(gca, 'FontSize', 12);
set(gca, 'Layer', 'top');
box on;

hold on;
[zmin, imin] = min(Z_fine(:));
[zmax, imax] = max(Z_fine(:));
[wimin, fimin] = ind2sub([nw_fine, nf_fine], imin);
[wimax, fimax] = ind2sub([nw_fine, nf_fine], imax);
plot(f_fine(fimin), w_fine(wimin), 'wo', 'MarkerSize', 10, 'MarkerFaceColor', 'k', ...
    'DisplayName', sprintf('Min: %.6f', zmin));
plot(f_fine(fimax), w_fine(wimax), 'w^', 'MarkerSize', 10, 'MarkerFaceColor', 'k', ...
    'DisplayName', sprintf('Max: %.6f', zmax));
legend('Location', 'southeast', 'FontSize', 11);
hold off;

fprintf('精细网格极值：\n');
fprintf('  Min neff = %.6f @ w = %.6f um, f = %d THz\n', zmin, w_fine(wimin), f_fine(fimin));
fprintf('  Max neff = %.6f @ w = %.6f um, f = %d THz\n\n', zmax, w_fine(wimax), f_fine(fimax));

saveas(gcf, 'sin_neff_fitted_fine.png');
savefig(gcf, 'sin_neff_fitted_fine.fig');
fprintf('精细网格图已保存\n\n');

%% 8. 残差分析
z_pred = feval(fit_result, y_fit, x_fit);
residuals = z_fit - z_pred;

figure('Position', [150, 150, 800, 500]);

subplot(1,2,1);
histogram(residuals, 80);
xlabel('残差 \Delta n_{eff}', 'FontSize', 12);
ylabel('频数', 'FontSize', 12);
title(sprintf('拟合残差分布 (RMSE=%.6f)', rmse_all), 'FontSize', 13);
grid on;

subplot(1,2,2);
scatter(z_pred, residuals, 8, 'filled', 'MarkerFaceAlpha', 0.3);
xlabel('预测值 Re(n_{eff})', 'FontSize', 12);
ylabel('残差 \Delta n_{eff}', 'FontSize', 12);
title('残差 vs 预测值', 'FontSize', 13);
yline(0, 'r--');
grid on;

saveas(gcf, 'sin_neff_residuals.png');
savefig(gcf, 'sin_neff_residuals.fig');
fprintf('残差分析图已保存\n\n');

%% 9. 保存拟合结果
save('neff_fit_result.mat', 'fit_result', 'fit_type', 'gof', 'r2_all', 'rmse_all', ...
     'w_fine', 'f_fine', 'Z_fine');
fprintf('拟合结果已保存为 neff_fit_result.mat\n\n');

%% 10. 特定宽度 neff vs 频率曲线
fprintf('===== 绘制 1.2um 和 1.5um 的 neff(f) 曲线 =====\n');

w_targets = [1.2, 1.5];
colors = {'b', 'r'};
markers = {'o', 's'};

figure('Position', [150, 150, 800, 550]);
hold on;

for k = 1:length(w_targets)
    w_val = w_targets(k);
    w_row = find(abs(width_um - w_val) < 0.01);
    if ~isempty(w_row)
        neff_at_w = neff_grid(w_row, :);
        valid_pts = ~isnan(neff_at_w);
        plot(freq_thz(valid_pts), neff_at_w(valid_pts), ...
            markers{k}, 'Color', colors{k}, 'MarkerSize', 7, ...
            'MarkerFaceColor', colors{k}, ...
            'DisplayName', sprintf('w = %.6f um (数据)', w_val));
    end
end

f_smooth = linspace(170, 220, 200)';
for k = 1:length(w_targets)
    w_vec = w_targets(k) * ones(size(f_smooth));
    neff_s = feval(fit_result, w_vec, f_smooth);
    plot(f_smooth, neff_s, '-', 'Color', colors{k}, 'LineWidth', 2.5, ...
        'DisplayName', sprintf('w = %.6f um (phys-4)', w_targets(k)));
end

xlabel('频率 f (THz)', 'FontSize', 13);
ylabel('有效折射率实部 Re(n_{eff})', 'FontSize', 13);
title('特定宽度的 neff(f) 曲线 (phys-4)', 'FontSize', 14);
legend('Location', 'northwest', 'FontSize', 11);
grid on; box on;
set(gca, 'FontSize', 12);
hold off;

fprintf('\n宽度 w = 1.200000 um:\n');
fprintf('  170 THz: neff = %.6f\n', feval(fit_result, 1.2, 170));
fprintf('  195 THz: neff = %.6f\n', feval(fit_result, 1.2, 195));
fprintf('  220 THz: neff = %.6f\n', feval(fit_result, 1.2, 220));
fprintf('\n宽度 w = 1.500000 um:\n');
fprintf('  170 THz: neff = %.6f\n', feval(fit_result, 1.5, 170));
fprintf('  195 THz: neff = %.6f\n', feval(fit_result, 1.5, 195));
fprintf('  220 THz: neff = %.6f\n', feval(fit_result, 1.5, 220));

saveas(gcf, 'neff_vs_freq_w1.2_w1.5.png');
savefig(gcf, 'neff_vs_freq_w1.2_w1.5.fig');
fprintf('\n曲线图已保存为 neff_vs_freq_w1.2_w1.5.png 和 .fig\n');

fprintf('\n======== 全部完成 ========\n');