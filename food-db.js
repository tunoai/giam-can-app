// --- Món ăn mẫu (dùng khi chưa có API Key hoặc AI lỗi) ---
// kcal/p/c/f cho 1 phần ăn · meals: b sáng, l trưa, d tối, s phụ · where: home nấu ở nhà, out ăn ngoài
// style: viet món Việt quen thuộc, new đổi gió, quick nhanh gọn, treat thèm đồ ngon (phiên bản nhẹ calo)
const FOOD_DB = [
    // ---- Ăn ngoài: món Việt ----
    { emoji: '🍜', name: 'Phở bò tái (tô nhỏ, nhiều rau)', desc: 'Nước dùng thanh ngọt, thịt bò tái mềm, thêm rau thơm và chanh ớt.', kcal: 400, p: 26, c: 50, f: 9, meals: 'bld', where: 'out', style: 'viet', time: 10, price: '45–60k' },
    { emoji: '🍲', name: 'Bún chả cá Nha Trang', desc: 'Chả cá dai giòn, nước lèo cá trong và thơm thì là.', kcal: 380, p: 24, c: 50, f: 8, meals: 'bld', where: 'out', style: 'viet', time: 10, price: '35–45k' },
    { emoji: '🍢', name: 'Bún chả Hà Nội (ít bún, nhiều rau)', desc: 'Chả nướng than thơm lừng, chấm nước mắm chua ngọt, ăn kèm rau sống.', kcal: 480, p: 28, c: 50, f: 17, meals: 'ld', where: 'out', style: 'viet', time: 10, price: '40–50k' },
    { emoji: '🥢', name: 'Bún thịt nướng (bỏ chả giò, ít mỡ hành)', desc: 'Thịt nướng sả cháy cạnh, đồ chua giòn, rưới nước mắm tỏi ớt.', kcal: 450, p: 26, c: 55, f: 12, meals: 'ld', where: 'out', style: 'viet', time: 10, price: '35–45k' },
    { emoji: '🐔', name: 'Miến gà trộn', desc: 'Miến dai, gà xé, hành phi và rau răm, chua cay vừa miệng.', kcal: 380, p: 28, c: 45, f: 9, meals: 'bld', where: 'out', style: 'viet', time: 10, price: '35–45k' },
    { emoji: '🌯', name: 'Gỏi cuốn tôm thịt (4 cuốn)', desc: 'Cuốn tươi mát, tôm đỏ au, chấm tương đậu phộng (dùng ít).', kcal: 330, p: 22, c: 45, f: 6, meals: 'lds', where: 'out', style: 'viet', time: 5, price: '30–40k' },
    { emoji: '🍚', name: 'Cơm gà nướng (½ phần cơm)', desc: 'Đùi gà nướng da giòn, cơm ít, dưa leo và đồ chua ăn kèm.', kcal: 520, p: 36, c: 55, f: 15, meals: 'ld', where: 'out', style: 'viet', time: 10, price: '40–50k' },
    { emoji: '🍱', name: 'Cơm văn phòng: cá kho tộ + canh chua + rau luộc', desc: 'Cá kho keo sánh, canh chua me thơm, ½ chén cơm là đủ đưa cơm.', kcal: 470, p: 30, c: 50, f: 14, meals: 'ld', where: 'out', style: 'viet', time: 5, price: '35–45k' },
    { emoji: '🥖', name: 'Bánh mì ốp la + dưa leo', desc: 'Vỏ giòn rụm, 2 trứng lòng đào, ít pate, nhiều dưa leo và ngò.', kcal: 420, p: 18, c: 48, f: 16, meals: 'b', where: 'out', style: 'viet', time: 5, price: '20–30k' },
    { emoji: '🥞', name: 'Bánh cuốn nóng chả lụa', desc: 'Bánh mỏng mềm, nhân thịt mộc nhĩ, chấm nước mắm pha loãng.', kcal: 380, p: 15, c: 58, f: 9, meals: 'b', where: 'out', style: 'viet', time: 5, price: '30–40k' },
    { emoji: '🦀', name: 'Bún riêu cua (ít bún, thêm đậu, rau)', desc: 'Riêu cua đóng bánh, cà chua chua dịu, rau muống chẻ giòn.', kcal: 420, p: 22, c: 52, f: 13, meals: 'bl', where: 'out', style: 'viet', time: 10, price: '35–45k' },
    // ---- Ăn ngoài: đổi gió ----
    { emoji: '🍣', name: 'Sashimi cá hồi + salad rong biển + súp miso', desc: 'Cá hồi béo ngậy tan trong miệng, rong biển giòn sần sật.', kcal: 420, p: 32, c: 20, f: 22, meals: 'ld', where: 'out', style: 'new', time: 15, price: '120–180k' },
    { emoji: '🍙', name: 'Kimbap cá ngừ (½ cuộn) + canh rong biển', desc: 'Cơm cuộn nhiều rau củ, cá ngừ sốt nhẹ, ăn no lâu.', kcal: 380, p: 18, c: 55, f: 9, meals: 'bl', where: 'out', style: 'new', time: 5, price: '45–60k' },
    { emoji: '🌶️', name: 'Gỏi bò kiểu Thái', desc: 'Bò áp chảo xắt mỏng, sả, hành tím, chanh, ớt, rau thơm: chua cay đã miệng.', kcal: 330, p: 30, c: 15, f: 15, meals: 'ld', where: 'out', style: 'new', time: 15, price: '80–110k' },
    { emoji: '🥑', name: 'Poke bowl cá ngừ (½ cơm, nhiều rau)', desc: 'Cá ngừ tươi, bơ, đậu nành Nhật, dưa leo, sốt shoyu mè.', kcal: 480, p: 34, c: 45, f: 17, meals: 'ld', where: 'out', style: 'new', time: 10, price: '90–130k' },
    { emoji: '🍡', name: 'Gà nướng xiên yakitori (5 xiên) + bắp cải', desc: 'Gà nướng sốt ngọt bóng bẩy, bắp cải giòn chấm sốt mè.', kcal: 380, p: 35, c: 18, f: 16, meals: 'ds', where: 'out', style: 'new', time: 15, price: '80–120k' },
    // ---- Ăn ngoài: thèm đồ ngon ----
    { emoji: '🍔', name: 'Burger bò 1 tầng, bỏ mayo, thay khoai bằng salad', desc: 'Vẫn đã cơn thèm burger, chỉ bằng nửa calo so với combo.', kcal: 450, p: 28, c: 38, f: 20, meals: 'ld', where: 'out', style: 'treat', time: 10, price: '60–90k' },
    { emoji: '🍕', name: 'Pizza đế mỏng (2 miếng) + salad', desc: 'Đế giòn, phô mai kéo sợi, chọn topping gà hoặc hải sản.', kcal: 480, p: 24, c: 50, f: 19, meals: 'ld', where: 'out', style: 'treat', time: 15, price: '80–120k' },
    { emoji: '🥤', name: 'Trà sữa 30% đường, thạch thay trân châu (M)', desc: 'Đủ ngọt để vui, ít hơn 200 kcal so với ly full topping.', kcal: 220, p: 3, c: 38, f: 7, meals: 's', where: 'out', style: 'treat', time: 5, price: '30–45k' },
    { emoji: '☕', name: 'Bạc xỉu ít sữa, ít ngọt', desc: 'Thơm béo vừa đủ, tỉnh táo cả buổi.', kcal: 110, p: 3, c: 16, f: 4, meals: 'bs', where: 'out', style: 'treat', time: 5, price: '20–35k' },
    // ---- Nấu ở nhà: món Việt ----
    { emoji: '🍗', name: 'Gà xào sả ớt + cải thìa luộc + ½ chén cơm', desc: 'Gà săn thơm sả, cay nhẹ, đưa cơm mà rất ít dầu.', kcal: 450, p: 38, c: 40, f: 14, meals: 'ld', where: 'home', style: 'viet', time: 25, price: '~50k' },
    { emoji: '🌿', name: 'Bò lá lốt áp chảo (6 cuốn) + bún + rau sống', desc: 'Lá lốt thơm nồng bọc thịt bò, áp chảo chứ không chiên ngập dầu.', kcal: 430, p: 30, c: 38, f: 17, meals: 'ld', where: 'home', style: 'viet', time: 30, price: '~70k' },
    { emoji: '🐟', name: 'Cá basa kho tiêu + canh bí xanh + ½ chén cơm', desc: 'Cá kho sánh, tiêu cay ấm, canh bí ngọt mát cân bằng.', kcal: 440, p: 30, c: 42, f: 15, meals: 'ld', where: 'home', style: 'viet', time: 30, price: '~50k' },
    { emoji: '🦐', name: 'Tôm rim mặn ngọt + rau muống xào tỏi + ½ chén cơm', desc: 'Tôm rim đỏ óng, mặn ngọt đậm đà, rau muống giòn thơm tỏi.', kcal: 430, p: 32, c: 42, f: 13, meals: 'ld', where: 'home', style: 'viet', time: 25, price: '~70k' },
    { emoji: '🍅', name: 'Đậu hũ nhồi thịt sốt cà + canh rau ngót', desc: 'Đậu mềm, nhân thịt ngọt, sốt cà chua sệt chan cơm.', kcal: 420, p: 28, c: 38, f: 17, meals: 'ld', where: 'home', style: 'viet', time: 30, price: '~40k' },
    { emoji: '🥣', name: 'Cháo yến mạch cá hồi gừng hành', desc: 'Sánh mịn, cá hồi béo, gừng ấm bụng, ăn tối nhẹ nhàng.', kcal: 340, p: 24, c: 34, f: 12, meals: 'bd', where: 'home', style: 'viet', time: 15, price: '~50k' },
    // ---- Nấu ở nhà: nhanh gọn ----
    { emoji: '🍳', name: 'Trứng cuộn rau củ + bánh mì nguyên cám + cà chua', desc: 'Trứng cuộn mềm, cà rốt, hành lá; 10 phút là xong.', kcal: 360, p: 22, c: 30, f: 16, meals: 'bd', where: 'home', style: 'quick', time: 10, price: '~20k' },
    { emoji: '🥭', name: 'Yến mạch ngâm qua đêm với sữa chua, xoài, hạt chia', desc: 'Chuẩn bị tối hôm trước, sáng mở ra ăn: mát lạnh, ngọt dịu.', kcal: 340, p: 18, c: 50, f: 8, meals: 'bs', where: 'home', style: 'quick', time: 5, price: '~25k' },
    { emoji: '🥙', name: 'Bánh tráng cuốn ức gà áp chảo + rau thơm', desc: 'Ức gà ướp tiêu tỏi áp chảo, cuốn rau thơm, chấm mắm chua.', kcal: 380, p: 38, c: 35, f: 8, meals: 'ld', where: 'home', style: 'quick', time: 15, price: '~40k' },
    { emoji: '🍜', name: 'Mì soba trộn gà xé + dưa leo + mè', desc: 'Mì kiều mạch dai, sốt tương mè, ăn lạnh rất cuốn.', kcal: 420, p: 30, c: 52, f: 9, meals: 'ld', where: 'home', style: 'quick', time: 15, price: '~45k' },
    { emoji: '🥗', name: 'Salad cá ngừ hộp + trứng + bắp ngọt', desc: 'Mở hộp, trộn là xong. Nhiều đạm, giòn ngọt.', kcal: 360, p: 34, c: 20, f: 15, meals: 'ld', where: 'home', style: 'quick', time: 10, price: '~45k' },
    // ---- Nấu ở nhà: đổi gió / thèm đồ ngon ----
    { emoji: '🥩', name: 'Bò bít tết 150g + khoai tây nướng + măng tây', desc: 'Bò áp chảo bơ tỏi tái vừa, khoai nướng vàng, măng tây giòn.', kcal: 520, p: 40, c: 35, f: 22, meals: 'd', where: 'home', style: 'treat', time: 25, price: '~120k' },
    { emoji: '🍗', name: 'Gà rán nồi chiên không dầu + salad bắp cải', desc: 'Da giòn rụm như gà rán mà gần như không dầu.', kcal: 430, p: 40, c: 22, f: 18, meals: 'ld', where: 'home', style: 'treat', time: 30, price: '~60k' },
    { emoji: '🍛', name: 'Cà ri gà sữa chua + bánh mì', desc: 'Thơm nghệ, sả, vị béo nhẹ từ sữa chua thay nước cốt dừa.', kcal: 470, p: 34, c: 42, f: 16, meals: 'ld', where: 'home', style: 'new', time: 35, price: '~60k' },
    { emoji: '🍲', name: 'Canh kim chi đậu hũ thịt heo + ½ chén cơm', desc: 'Chua cay kiểu Hàn, nóng hổi, ấm bụng.', kcal: 400, p: 28, c: 35, f: 15, meals: 'ld', where: 'home', style: 'new', time: 25, price: '~50k' },
    { emoji: '🍣', name: 'Cá hồi sốt teriyaki + cơm gạo lứt + bông cải', desc: 'Sốt teriyaki bóng mật, cá hồi mọng, bông cải xanh giòn.', kcal: 500, p: 33, c: 42, f: 20, meals: 'ld', where: 'home', style: 'new', time: 20, price: '~100k' },
    // ---- Bữa phụ ngon miệng ----
    { emoji: '🥭', name: 'Xoài cát + sữa chua Hy Lạp', desc: 'Xoài thơm lừng, sữa chua sánh đặc, chua ngọt mát lạnh.', kcal: 190, p: 12, c: 28, f: 3, meals: 's', where: 'home', style: 'quick', time: 3, price: '~25k' },
    { emoji: '🌽', name: 'Bắp nếp luộc', desc: 'Dẻo, ngọt tự nhiên, ăn ấm tay.', kcal: 150, p: 5, c: 30, f: 2, meals: 'bs', where: 'out', style: 'viet', time: 0, price: '~10k' },
    { emoji: '🍠', name: 'Khoai lang mật nướng (1 củ vừa)', desc: 'Ruột vàng óng chảy mật, thơm như kẹo.', kcal: 160, p: 2, c: 37, f: 0, meals: 'bs', where: 'home', style: 'viet', time: 25, price: '~10k' },
    { emoji: '🌱', name: 'Đậu nành Nhật (edamame) rang muối', desc: 'Bóc từng hạt, bùi bùi mằn mặn, nhiều đạm.', kcal: 150, p: 13, c: 10, f: 6, meals: 's', where: 'home', style: 'new', time: 5, price: '~30k' },
    { emoji: '🍧', name: 'Chè đậu đen ít đường', desc: 'Đậu đen bùi, ngọt nhẹ, giải nhiệt buổi chiều.', kcal: 180, p: 7, c: 34, f: 2, meals: 's', where: 'out', style: 'viet', time: 0, price: '~15k' },
    { emoji: '🍓', name: 'Sinh tố dâu chuối sữa chua (không đường)', desc: 'Mịn mát, chua ngọt, no được tới bữa sau.', kcal: 200, p: 8, c: 38, f: 2, meals: 'bs', where: 'home', style: 'quick', time: 5, price: '~25k' },
    { emoji: '🍘', name: 'Bánh gạo lứt + phô mai + dưa leo', desc: 'Giòn rộp, béo mặn, ăn vặt mà không thấy tội lỗi.', kcal: 150, p: 6, c: 18, f: 6, meals: 's', where: 'home', style: 'quick', time: 2, price: '~15k' },
    { emoji: '🍫', name: 'Socola đen 85% (2 ô) + hạnh nhân', desc: 'Đắng nhẹ, thơm cacao, đã cơn thèm ngọt.', kcal: 160, p: 4, c: 8, f: 13, meals: 's', where: 'home', style: 'treat', time: 0, price: '~20k' },
    { emoji: '🍉', name: 'Trái cây dầm sữa chua (ly nhỏ)', desc: 'Dưa hấu, thơm, đu đủ, sữa chua ít đường.', kcal: 170, p: 6, c: 32, f: 2, meals: 's', where: 'out', style: 'treat', time: 0, price: '~25k' }
];
