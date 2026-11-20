// ==========================================================================
// FITLIFE - DỮ LIỆU TĨNH: giáo trình 5K, khởi động, bài tập gym, món ăn mẫu
// ==========================================================================

// --- Giáo trình chạy 5K: 12 tuần x 3 buổi, tăng từng bước nhỏ ---
// Điểm xuất phát: đang chạy 3′ / đi 3′ nhưng mới 3 hiệp đã mệt → tuần 1 lùi về hiệp ngắn hơn cho chắc nền
// Mỗi buổi: đi bộ nhanh khởi động 5 phút -> các hiệp chạy/đi bộ -> đi bộ thả lỏng 5 phút
const WARM = { type: 'warm', sec: 300, label: 'Đi bộ nhanh khởi động' };
const COOL = { type: 'cool', sec: 300, label: 'Đi bộ thả lỏng' };
const run = (min) => ({ type: 'run', sec: Math.round(min * 60), label: 'Chạy chậm' });
const walk = (min) => ({ type: 'walk', sec: Math.round(min * 60), label: 'Đi bộ' });
const repeat = (n, parts) => Array.from({ length: n }, () => parts).flat();

function buildSession(id, week, day, title, desc, parts) {
    return { id, week, day, title, desc, phases: [WARM, ...parts, COOL] };
}

const RUN_PLAN = (() => {
    const s = [];
    const add = (week, day, title, desc, parts) =>
        s.push(buildSession(`w${week}d${day}`, week, day, title, desc, parts));
    const same3 = (week, title, desc, parts) => { for (let d = 1; d <= 3; d++) add(week, d, title, desc, parts); };

    same3(1, '6 × (chạy 2′ + đi 2′)', 'Xây nền: hiệp ngắn hơn nhưng nhiều hiệp hơn. Chạy CHẬM tới mức vẫn nói chuyện được.', repeat(6, [run(2), walk(2)]));
    same3(2, '5 × (chạy 3′ + đi 3′)', 'Mức bạn đang tập, nhưng làm đủ 5 hiệp. Mệt thì chạy chậm lại chứ đừng dừng.', repeat(5, [run(3), walk(3)]));
    same3(3, '5 × (chạy 3′ + đi 2′)', 'Giữ 3 phút chạy, rút ngắn thời gian nghỉ.', repeat(5, [run(3), walk(2)]));
    same3(4, '4 × (chạy 4′ + đi 2′)', 'Lần đầu chạy 4 phút liền.', repeat(4, [run(4), walk(2)]));
    same3(5, '4 × (chạy 5′ + đi 2′30)', 'Chạy 5 phút liền, tổng 20 phút chạy.', repeat(4, [run(5), walk(2.5)]));
    same3(6, '3 × (chạy 7′ + đi 2′30)', 'Hiệp dài hơn, nghỉ vẫn đủ để hồi sức.', repeat(3, [run(7), walk(2.5)]));
    same3(7, '3 × (chạy 8′ + đi 2′)', '24 phút chạy. Thả lỏng vai, bước chân ngắn.', repeat(3, [run(8), walk(2)]));
    same3(8, '2 × (chạy 12′ + đi 2′)', 'Chỉ còn 1 lần nghỉ giữa buổi.', repeat(2, [run(12), walk(2)]));
    add(9, 1, 'Chạy 15′, đi 2′, chạy 10′', 'Hiệp đầu dài 15 phút.', [run(15), walk(2), run(10)]);
    add(9, 2, 'Chạy 18′, đi 2′, chạy 8′', 'Dồn dần sang một hiệp dài.', [run(18), walk(2), run(8)]);
    add(9, 3, 'Chạy liền 20 phút 💪', 'Mốc lớn: 20 phút không dừng! Chậm cũng được.', [run(20)]);
    add(10, 1, 'Chạy liền 22 phút', 'Giữ tốc độ thật đều.', [run(22)]);
    add(10, 2, 'Chạy liền 24 phút', '', [run(24)]);
    add(10, 3, 'Chạy liền 25 phút', '', [run(25)]);
    same3(11, 'Chạy liền 28 phút', 'Gần tới đích rồi!', [run(28)]);
    add(12, 1, 'Chạy liền 30 phút', '30 phút ≈ 4–5 km.', [run(30)]);
    add(12, 2, 'Chạy liền 32 phút', 'Thử tăng tốc nhẹ 3 phút cuối nếu còn sức.', [run(32)]);
    add(12, 3, '🏁 Chạy 5 km', 'Ngày tốt nghiệp: chạy hết 5 km, bao lâu cũng được!', [run(40)]);
    return s;
})();
const RUN_WEEKS = Math.max(...RUN_PLAN.map((x) => x.week));

// --- Khởi động bắp chân & cổ chân (trước khi chạy) ---
const WARMUP_ROUTINE = {
    id: 'warmup',
    title: 'Khởi động bắp chân & cổ chân',
    desc: 'Khoảng 6 phút. Làm trước mỗi buổi chạy để tránh chuột rút, đau gót và lật cổ chân.',
    steps: [
        { name: 'Xoay cổ chân trái', sec: 30, emoji: '🔄', how: 'Đứng một chân (vịn tường nếu cần), nhấc chân trái, xoay cổ chân 10 vòng thuận rồi 10 vòng ngược.' },
        { name: 'Xoay cổ chân phải', sec: 30, emoji: '🔄', how: 'Đổi chân, xoay 10 vòng thuận rồi 10 vòng ngược. Xoay chậm, vòng to.' },
        { name: 'Gập – duỗi cổ chân', sec: 30, emoji: '🦶', how: 'Ngồi hoặc đứng vịn tường, lần lượt kéo mũi chân về phía ống chân rồi duỗi thẳng ra như đạp ga. Đổi chân liên tục.' },
        { name: 'Nhón gót 2 chân', sec: 40, emoji: '⬆️', how: 'Đứng thẳng, nhón gót lên cao hết mức, giữ 1 giây rồi hạ chậm. Làm khoảng 15–20 lần.' },
        { name: 'Đi bằng mũi chân', sec: 30, emoji: '🩰', how: 'Nhón gót và đi bước ngắn bằng mũi chân. Giữ người thẳng, siết nhẹ bụng.' },
        { name: 'Đi bằng gót chân', sec: 30, emoji: '👣', how: 'Nhấc mũi chân lên, đi bằng gót. Bài này khởi động cơ cẳng chân trước, giúp tránh đau ống quyển.' },
        { name: 'Gối chạm tường – trái', sec: 30, emoji: '🧱', how: 'Đứng đối diện tường, chân trái phía trước cách tường một bàn tay. Đẩy gối về phía tường, gót không nhấc lên. Nhịp nhàng 10–12 lần.' },
        { name: 'Gối chạm tường – phải', sec: 30, emoji: '🧱', how: 'Đổi chân phải phía trước, làm tương tự 10–12 lần.' },
        { name: 'Đá chân trước – sau', sec: 40, emoji: '🦵', how: 'Vịn tường, đá thả lỏng từng chân ra trước và ra sau, khoảng 10 lần mỗi bên.' },
        { name: 'Nhún nhảy nhẹ tại chỗ', sec: 30, emoji: '🐇', how: 'Nhảy nhỏ, nhanh bằng nửa trước bàn chân, gối hơi chùng. Tiếp đất êm, không dậm gót.' }
    ]
};

// --- Giãn cơ sau khi chạy ---
const COOLDOWN_ROUTINE = {
    id: 'cooldown',
    title: 'Giãn cơ sau khi chạy',
    desc: 'Khoảng 4 phút. Giữ mỗi tư thế, thở đều, không nhún.',
    steps: [
        { name: 'Giãn bắp chân trái (gối thẳng)', sec: 30, emoji: '🧱', how: 'Hai tay chống tường, chân trái lùi sau, gối thẳng, gót ép xuống sàn. Cảm thấy căng ở bắp chân.' },
        { name: 'Giãn bắp chân phải (gối thẳng)', sec: 30, emoji: '🧱', how: 'Đổi sang chân phải, làm tương tự.' },
        { name: 'Giãn cơ dép trái (gối chùng)', sec: 30, emoji: '🦶', how: 'Như bài trên nhưng gối chân sau hơi chùng xuống. Căng phần thấp bắp chân, gần gót.' },
        { name: 'Giãn cơ dép phải (gối chùng)', sec: 30, emoji: '🦶', how: 'Đổi chân, làm tương tự.' },
        { name: 'Giãn đùi trước', sec: 40, emoji: '🦵', how: 'Đứng vịn tường, cầm cổ chân kéo gót về phía mông, hai gối sát nhau. Mỗi bên 20 giây.' },
        { name: 'Giãn đùi sau', sec: 40, emoji: '🙇', how: 'Đặt gót một chân lên bậc thấp, lưng thẳng, gập người nhẹ về trước. Mỗi bên 20 giây.' }
    ]
};

// --- Hướng dẫn sử dụng máy tập gym ---
const GYM_GROUPS = [
    { id: 'mine', name: '⭐ Máy hay tập' },
    { id: 'dumbbell', name: 'Tạ tay 5kg' },
    { id: 'chest', name: 'Ngực' },
    { id: 'basic', name: 'Cơ bản khác' }
];

const GYM_EXERCISES = [
    {
        id: 'chest-press', group: 'chest', name: 'Máy đẩy ngực', en: 'Chest Press Machine', emoji: '🏋️',
        target: 'Ngực giữa, vai trước, tay sau',
        setup: [
            'Chỉnh độ cao ghế sao cho tay cầm ngang giữa ngực (ngang núm vú).',
            'Nếu máy có cần đẩy tay cầm ra trước, đạp nó để đưa tay cầm về vị trí bắt đầu.',
            'Chọn mức tạ nhẹ cho buổi đầu: đẩy được 12 lần, 2 lần cuối thấy nặng là vừa.'
        ],
        steps: [
            'Ngồi lưng áp sát đệm, ưỡn nhẹ ngực, kéo hai bả vai ra sau và xuống.',
            'Nắm tay cầm, khuỷu tay chếch xuống khoảng 45° so với thân (không bè ngang vai).',
            'Thở ra và đẩy ra trước tới khi tay gần thẳng, không khóa cứng khuỷu.',
            'Hít vào, đưa tay về chậm trong 2–3 giây tới khi thấy ngực căng nhẹ.'
        ],
        mistakes: ['Nhấc lưng hoặc mông khỏi đệm', 'Nhún vai lên tai', 'Duỗi thẳng khóa cứng khuỷu tay', 'Thả tạ rơi nhanh, đập vào chồng tạ'],
        sets: '3 hiệp × 10–12 lần, nghỉ 60–90 giây',
        video: 'chest press machine hướng dẫn'
    },
    {
        id: 'pec-deck', group: 'mine', name: 'Máy ép ngực (tay nắm)', en: 'Pec Deck / Butterfly', emoji: '🦋',
        target: 'Ngực (phần trong và giữa), vai trước',
        setup: [
            'Chỉnh độ cao ghế sao cho tay nắm ngang ngực; khi ngồi, tay dang ra ngang vai hoặc thấp hơn vai một chút (không cao hơn vai).',
            'Nếu máy có chốt chỉnh tay đòn, chỉnh để lúc mở hết tay chỉ ngang thân hoặc ra sau một chút, không quá rộng.',
            'Chọn mức tạ ép được 12–15 lần chậm rãi, 2–3 lần cuối thấy nặng là vừa.'
        ],
        steps: [
            'Ngồi lưng áp sát đệm, hai chân đặt vững trên sàn, ưỡn ngực, kéo hai bả vai ra sau và xuống.',
            'Nắm hai tay nắm dọc, khuỷu tay hơi cong nhẹ và giữ nguyên góc này suốt bài.',
            'Thở ra, ép hai tay vào nhau trước ngực như đang ôm một thân cây lớn. Nghĩ là dùng ngực kéo, không phải dùng tay.',
            'Siết ngực 1 giây khi hai tay nắm gần chạm nhau.',
            'Hít vào, mở tay ra chậm trong 2–3 giây tới khi thấy ngực căng nhẹ thì dừng, không để tạ chạm chồng.'
        ],
        mistakes: ['Mở tay quá rộng ra sau lưng, rất dễ đau khớp vai', 'Ghế quá thấp khiến tay nắm cao hơn vai', 'Rướn người, lưng rời đệm hoặc dùng đà', 'Nhún vai lên tai khi ép'],
        sets: '3 hiệp × 12–15 lần, nghỉ 60 giây',
        video: 'pec deck fly máy ép ngực hướng dẫn'
    },
    {
        id: 'pri13-pullup', group: 'mine', assist: true, name: 'Hít xà trên máy Elip Pri13', en: 'Assisted Pull-up · tay rộng', emoji: '🧗',
        target: 'Vai sau, lưng xô (lưng rộng hình chữ V), lưng giữa, tay trước',
        freq: '2–3 buổi/tuần, cách ngày (VD: T2–T4–T6). Tập bài này ĐẦU buổi khi còn khoẻ.',
        setup: [
            'Đây là máy hỗ trợ: tạ càng NẶNG thì càng DỄ (tạ đẩy bạn lên). Mức kg cụ thể xem ở phần Lộ trình bên dưới.',
            'Cắm chốt vào chồng tạ ở mức kg của cột mốc bạn đang tập.',
            'Bước lên 2 bậc đứng hai bên, với tay nắm thanh xà trên cùng, rồi quỳ lần lượt từng gối lên đệm đen ở giữa (đệm hạ xuống theo người).',
            'Nắm 2 tay cầm chếch xuống ở hai đầu thanh xà, rộng hơn vai, lòng bàn tay hướng ra trước. Cách nắm này dồn lực vào vai sau và lưng xô.'
        ],
        steps: [
            'Bắt đầu tay gần duỗi thẳng, ưỡn ngực, siết bụng, mắt nhìn lên xà.',
            'Hạ vai xuống xa tai trước (như ép bả vai vào túi quần sau), rồi mới bắt đầu kéo.',
            'Thở ra, kéo khuỷu tay xuống và ra sau, đưa ngực lên phía xà tới khi cằm qua xà.',
            'Siết lưng và vai sau 1 giây ở trên cùng.',
            'Hít vào, hạ người chậm 2–3 giây tới khi tay gần thẳng (không thả rơi).',
            'Xong hiệp: bước chân xuống bậc đứng TỪNG CHÂN một rồi mới buông tay.'
        ],
        mistakes: ['Buông tay khi gối còn trên đệm, đệm bật lên rất nguy hiểm', 'Nhún vai, rụt cổ khi kéo (dễ đau vai cổ)', 'Đung đưa người, đá chân lấy đà', 'Chỉ kéo nửa đường hoặc thả rơi khi hạ', 'Giảm tạ hỗ trợ quá nhanh khi chưa đủ số lần'],
        sets: 'Theo cột mốc đang tập trong Lộ trình. Nghỉ 90 giây – 2 phút giữa các hiệp',
        video: 'assisted pull up machine hướng dẫn'
    },
    {
        id: 'assisted-dip', group: 'mine', assist: true, name: 'Nhúng xà có hỗ trợ', en: 'Assisted Dip · máy Elip Pri13', emoji: '⏬',
        target: 'Tay sau, ngực dưới, vai trước',
        setup: [
            'Đây là máy hỗ trợ: tạ càng NẶNG thì càng DỄ (tạ đẩy bạn lên). Người mới nên chọn khoảng 50–60% cân nặng cơ thể.',
            'Máy Elip Pri13: bước lên 2 bậc đứng hai bên, nắm tay cầm, rồi quỳ lần lượt từng gối lên đệm đen ở giữa (đệm sẽ hạ xuống theo người).',
            'Quỳ lên đệm gối, nắm 2 tay cầm nhúng xà chĩa ra trước ở tầng giữa của máy (ngang hông khi đứng trên bậc), lòng bàn tay hướng vào nhau.'
        ],
        steps: [
            'Bắt đầu tay duỗi gần thẳng, vai hạ xuống xa tai, người hơi nghiêng về trước.',
            'Hít vào, gập khuỷu tay hạ người xuống chậm tới khi cánh tay trên song song sàn (khoảng 90°).',
            'Thở ra, đẩy người lên tới khi tay gần thẳng, không khóa cứng khuỷu.'
        ],
        mistakes: ['Buông tay khi gối còn trên đệm, đệm bật lên rất nguy hiểm. Xong hiệp: bước xuống bậc TỪNG CHÂN rồi mới buông tay', 'Hạ quá sâu khiến vai bị kéo căng, dễ đau vai', 'Khuỷu tay bè rộng ra hai bên', 'Nhún vai lên tai'],
        sets: '3 hiệp × 8–12 lần. Tiến bộ = giảm dần tạ hỗ trợ',
        video: 'assisted dip machine hướng dẫn'
    },
    {
        id: 'push-up', group: 'chest', name: 'Hít đất (chống đẩy)', en: 'Push-up', emoji: '🤸',
        target: 'Ngực, vai, tay sau, bụng',
        setup: [
            'Mới tập: chống tay lên ghế/bàn (càng cao càng dễ), hoặc chống gối xuống sàn.',
            'Hai tay rộng hơn vai một chút, ngón tay hướng về trước.'
        ],
        steps: [
            'Người thẳng một đường từ đầu tới gót (hoặc tới gối), siết bụng và mông.',
            'Hít vào, hạ ngực xuống, khuỷu tay chếch về sau khoảng 45°.',
            'Thở ra, đẩy mạnh lên tới khi tay gần thẳng.'
        ],
        mistakes: ['Võng lưng, mông chổng cao', 'Khuỷu tay bè ngang 90°', 'Chỉ cúi đầu xuống thay vì hạ cả ngực'],
        sets: '3 hiệp × tối đa có thể (dừng trước khi sai tư thế)',
        video: 'hít đất đúng cách cho người mới'
    },
    {
        id: 'machine-curl', group: 'mine', name: 'Máy cuốn tay trước (TGP-340)', en: 'Seated Biceps Curl Machine', emoji: '💪',
        target: 'Cơ tay trước (bắp tay), cẳng tay',
        setup: [
            'Ngồi lên ghế, mặt quay về phía chồng tạ, ngực áp vào mép trên của đệm tì tay nghiêng.',
            'Chỉnh độ cao ghế (cần gạt/ty hơi dưới ghế) sao cho nách chạm sát mép trên đệm, mặt sau cánh tay nằm phẳng trên đệm.',
            'Khuỷu tay phải thẳng hàng với trục xoay tròn ở đầu tay đòn. Lệch trục là nguyên nhân chính gây đau khuỷu.',
            'Cắm chốt chọn tạ ở mức nhẹ cho buổi đầu: cuốn được 12 lần, 2 lần cuối thấy nặng là vừa.'
        ],
        steps: [
            'Nắm hai tay cầm của tay đòn, lòng bàn tay ngửa lên, cổ tay thẳng, hai chân đặt vững trên sàn.',
            'Bắt đầu với tay gần duỗi thẳng (khuỷu hơi cong, tạ chưa chạm chồng).',
            'Thở ra, cuốn tay đòn lên về phía vai tới khi bắp tay co hết, siết 1 giây.',
            'Hít vào, hạ xuống chậm trong 2–3 giây, gần duỗi thẳng nhưng không để tạ chạm chồng và không khóa cứng khuỷu.',
            'Lưng, ngực và cánh tay trên áp đệm suốt bài, chỉ cẳng tay chuyển động.'
        ],
        mistakes: ['Nhấc mông hoặc ngả người ra sau để kéo', 'Ghế sai độ cao, khuỷu tay lệch trục xoay', 'Duỗi thẳng khóa khuỷu ở dưới, dễ đau khớp', 'Gập cổ tay vào trong', 'Thả tạ rơi nhanh, đập vào chồng tạ'],
        sets: '3 hiệp × 10–12 lần, nghỉ 60 giây. Đủ 12 lần cả 3 hiệp thì tăng 1 nấc tạ',
        video: 'seated biceps curl machine hướng dẫn'
    },
    {
        id: 'db-curl', group: 'dumbbell', name: 'Cuốn tạ tay (tay trước)', en: 'Dumbbell Curl', emoji: '🥊',
        target: 'Cơ tay trước',
        setup: ['Dùng 2 quả tạ tay 5 kg.', 'Đứng thẳng, hai chân rộng bằng hông, gối hơi chùng.'],
        steps: [
            'Hai tay buông thẳng, lòng bàn tay hướng ra trước, khuỷu tay ép sát hông.',
            'Thở ra, cuốn tạ lên ngang vai, chỉ cẳng tay chuyển động.',
            'Hít vào, hạ chậm về vị trí đầu.'
        ],
        mistakes: ['Đung đưa người lấy đà', 'Khuỷu tay trôi ra trước', 'Hạ tạ quá nhanh'],
        sets: '3 hiệp × 10–12 lần',
        video: 'dumbbell curl đúng kỹ thuật'
    },
    {
        id: 'hammer-curl', group: 'dumbbell', name: 'Cuốn búa', en: 'Hammer Curl', emoji: '🔨',
        target: 'Tay trước, cẳng tay',
        setup: ['Dùng 2 quả tạ tay 5 kg, đứng thẳng.'],
        steps: [
            'Cầm tạ dọc như cầm búa, lòng bàn tay hướng vào thân.',
            'Khuỷu tay ép sát hông, thở ra và cuốn tạ lên ngang vai.',
            'Hít vào, hạ chậm xuống.'
        ],
        mistakes: ['Xoay cổ tay trong lúc cuốn', 'Nhún vai lên'],
        sets: '2–3 hiệp × 12 lần',
        video: 'hammer curl hướng dẫn'
    },
    {
        id: 'lat-pulldown', group: 'mine', name: 'Máy kéo xô (thanh dài)', en: 'Lat Pulldown', emoji: '⬇️',
        target: 'Lưng xô (giúp lưng rộng, eo trông nhỏ hơn), lưng giữa, tay trước',
        setup: [
            'Cắm chốt chọn tạ ở mức nhẹ cho buổi đầu: kéo được 12 lần đúng tư thế, 2 lần cuối thấy nặng là vừa.',
            'Ngồi quay mặt vào máy, chỉnh đệm giữ đùi (nếu có) sao cho đùi bị ép chặt, người không bị kéo nhổm lên.',
            'Đứng dậy nắm thanh dài ở chỗ cong hai đầu, rộng hơn vai khoảng 1,5 lần, lòng bàn tay hướng ra trước, rồi ngồi xuống kéo thanh theo.'
        ],
        steps: [
            'Bắt đầu tay gần duỗi thẳng phía trên đầu, ưỡn ngực, ngả người ra sau nhẹ khoảng 10–15°.',
            'Hạ vai xuống xa tai trước, rồi thở ra và kéo thanh xuống trước mặt tới ngang cằm hoặc ngực trên. Nghĩ là kéo khuỷu tay xuống và ra sau, không kéo bằng bàn tay.',
            'Siết lưng 1 giây ở dưới, hai bả vai ép vào nhau.',
            'Hít vào, trả thanh lên chậm 2–3 giây tới khi tay gần thẳng, vai được kéo căng nhẹ, tạ không chạm chồng.'
        ],
        mistakes: ['Kéo thanh ra sau gáy, rất dễ đau vai cổ', 'Ngả người quá nhiều, giật người dùng đà', 'Nhún vai lên tai khi kéo', 'Thả thanh bật lên nhanh, tạ đập vào chồng'],
        sets: '3 hiệp × 10–12 lần, nghỉ 60–90 giây. Đủ 12 lần cả 3 hiệp thì tăng 1 nấc tạ',
        video: 'lat pulldown hướng dẫn'
    },
    {
        id: 'seated-row', group: 'basic', name: 'Máy chèo ngồi', en: 'Seated Row', emoji: '🚣',
        target: 'Lưng giữa, xô, tay trước',
        setup: ['Chỉnh ghế để tay cầm ngang bụng trên hoặc ngực dưới.', 'Đặt chân chắc chắn lên bàn đạp hoặc tì ngực vào đệm.'],
        steps: [
            'Lưng thẳng, ngực ưỡn, tay duỗi thẳng nắm tay cầm.',
            'Thở ra, kéo tay cầm về bụng, ép hai bả vai vào nhau.',
            'Hít vào, trả về chậm, không gù lưng.'
        ],
        mistakes: ['Gù lưng khi trả tạ', 'Ngả người ra sau kéo bằng lưng dưới'],
        sets: '3 hiệp × 10–12 lần',
        video: 'seated row machine hướng dẫn'
    },
    {
        id: 'leg-press', group: 'basic', name: 'Máy đạp đùi', en: 'Leg Press', emoji: '🦿',
        target: 'Đùi trước, mông, đùi sau',
        setup: ['Chỉnh lưng ghế để gối gập khoảng 90° ở vị trí thấp nhất.', 'Đặt chân giữa bàn đạp, rộng bằng vai, mũi chân hơi mở.'],
        steps: [
            'Lưng và mông áp sát đệm, tay nắm tay vịn.',
            'Thở ra, đạp bằng cả bàn chân (dồn lực gót) tới khi chân gần thẳng, không khóa gối.',
            'Hít vào, hạ chậm tới khi gối khoảng 90°, mông không nhấc khỏi ghế.'
        ],
        mistakes: ['Khóa thẳng gối khi đạp lên', 'Hạ quá sâu làm mông cuộn khỏi ghế', 'Gối chụm vào trong'],
        sets: '3 hiệp × 12–15 lần',
        video: 'leg press hướng dẫn'
    },
    {
        id: 'db-shoulder-press', group: 'dumbbell', name: 'Đẩy vai tạ tay', en: 'Dumbbell Shoulder Press', emoji: '🙆',
        target: 'Vai trước, vai giữa, tay sau',
        setup: ['2 quả tạ 5 kg. Ngồi ghế có tựa lưng (dễ giữ lưng thẳng) hoặc đứng.'],
        steps: [
            'Đưa tạ lên ngang tai, lòng bàn tay hướng ra trước, khuỷu tay hơi chếch về trước.',
            'Thở ra, đẩy tạ thẳng lên tới khi tay gần thẳng, hai quả tạ gần chạm nhau trên đầu.',
            'Hít vào, hạ chậm về ngang tai.'
        ],
        mistakes: ['Ưỡn lưng quá mức khi đẩy', 'Hạ tạ thấp hơn vai', 'Khóa cứng khuỷu tay ở trên'],
        sets: '3 hiệp × 10–12 lần',
        video: 'dumbbell shoulder press đúng kỹ thuật'
    },
    {
        id: 'db-lateral', group: 'dumbbell', name: 'Dang tay ngang (vai)', en: 'Lateral Raise', emoji: '🕊️',
        target: 'Vai giữa (giúp vai trông rộng hơn)',
        setup: ['Với bài này 5 kg có thể hơi nặng: nếu phải vung người thì làm từng tay một hoặc giảm số lần.'],
        steps: [
            'Đứng thẳng, tạ hai bên hông, khuỷu tay hơi cong.',
            'Thở ra, dang tay ra hai bên tới ngang vai.',
            'Hít vào, hạ chậm 2–3 giây.'
        ],
        mistakes: ['Vung người lấy đà', 'Nhún vai khi nâng', 'Nâng cao quá vai'],
        sets: '3 hiệp × 12–15 lần',
        video: 'lateral raise dumbbell hướng dẫn'
    },
    {
        id: 'db-triceps', group: 'dumbbell', name: 'Duỗi tay sau qua đầu', en: 'Overhead Triceps Extension', emoji: '💪',
        target: 'Tay sau (giúp bắp tay sau săn chắc)',
        setup: ['Dùng 1 quả tạ 5 kg, hai tay ôm một đầu tạ. Ngồi hoặc đứng thẳng.'],
        steps: [
            'Đưa tạ lên thẳng trên đầu, khuỷu tay chỉ lên trần, sát hai bên tai.',
            'Hít vào, gập khuỷu hạ tạ ra sau gáy chậm rãi.',
            'Thở ra, duỗi tay đưa tạ lên lại. Chỉ cẳng tay chuyển động.'
        ],
        mistakes: ['Khuỷu tay bè rộng ra', 'Ưỡn lưng'],
        sets: '3 hiệp × 12 lần',
        video: 'overhead triceps extension dumbbell'
    },
    {
        id: 'db-row', group: 'dumbbell', name: 'Chèo tạ tay 1 bên', en: 'One-arm Dumbbell Row', emoji: '🚣',
        target: 'Lưng xô, lưng giữa',
        setup: ['1 quả tạ 5 kg. Tì một tay và một gối lên ghế băng, lưng thẳng song song sàn.'],
        steps: [
            'Tay còn lại cầm tạ buông thẳng xuống sàn.',
            'Thở ra, kéo tạ về phía hông, khuỷu tay đi sát thân, siết lưng 1 giây.',
            'Hít vào, hạ chậm. Làm xong một bên rồi đổi bên.'
        ],
        mistakes: ['Xoay người để kéo', 'Gù lưng', 'Kéo tạ về phía ngực thay vì hông'],
        sets: '3 hiệp × 12 lần mỗi bên',
        video: 'one arm dumbbell row hướng dẫn'
    },
    {
        id: 'db-goblet-squat', group: 'dumbbell', name: 'Squat ôm tạ', en: 'Goblet Squat', emoji: '🏆',
        target: 'Đùi, mông, bụng (đốt nhiều calo)',
        setup: ['Ôm 1 quả tạ 5 kg dọc trước ngực. Chân rộng hơn vai, mũi chân hơi mở.'],
        steps: [
            'Hít vào, đẩy mông ra sau và ngồi xuống như ngồi ghế, ngực thẳng, gót không nhấc.',
            'Xuống tới khi đùi song song sàn (hoặc thấp nhất mà lưng vẫn thẳng).',
            'Thở ra, đạp gót đứng lên, siết mông ở trên.'
        ],
        mistakes: ['Gối chụm vào trong', 'Nhấc gót', 'Gù lưng khi xuống'],
        sets: '3 hiệp × 15 lần',
        video: 'goblet squat hướng dẫn'
    }
];

const GYM_TEMPLATES = [
    { id: 'M', name: '⭐ Buổi của tôi: hít xà Pri13 + ngực + lưng + tay + vai', items: ['pri13-pullup', 'pec-deck', 'lat-pulldown', 'assisted-dip', 'machine-curl', 'db-shoulder-press', 'db-lateral'] },
    { id: 'A', name: 'Buổi A: Ngực + Tay trước', items: ['chest-press', 'pec-deck', 'machine-curl', 'hammer-curl', 'lat-pulldown'] },
    { id: 'B', name: 'Buổi B: Toàn thân + tạ tay', items: ['db-goblet-squat', 'leg-press', 'seated-row', 'db-row', 'db-triceps', 'push-up'] }
];

// --- Lộ trình tập cho từng máy (tick khi đạt cột mốc) ---
// kg: '{bw0.5}' = 50% cân nặng hiện tại, làm tròn tới 2,5 kg (tự cập nhật khi cân nặng đổi)
// w: thời gian · t: cột mốc · kg: mức tạ (máy hỗ trợ: tạ hỗ trợ) · sets: số hiệp mỗi buổi · reps: số lần mỗi hiệp · d: ghi chú
const GYM_ROADMAPS = {
    'pri13-pullup': [
        { w: 'Tuần 1–2', t: 'Làm quen máy, học kéo đúng', kg: '{bw0.65}', sets: 3, reps: '6–8', d: 'Tay rộng hơn vai. Kéo tới cằm qua xà, hạ chậm 3 giây. Nghỉ 90 giây giữa các hiệp.' },
        { w: 'Tuần 3–4', t: 'Đủ số lần', kg: '{bw0.6}', sets: 3, reps: '8–10', d: 'Cả 3 hiệp đều đủ 10 lần đúng tư thế thì sang mốc sau.' },
        { w: 'Tuần 5–6', t: 'Thêm hiệp, giảm hỗ trợ lần 1', kg: '{bw0.5}', sets: 4, reps: '8', d: 'Ở trên cùng siết lưng và vai sau 1 giây.' },
        { w: 'Tuần 7–9', t: 'Giảm hỗ trợ lần 2', kg: '{bw0.4}', sets: 4, reps: '8', d: 'Hiệp cuối được phép chỉ 6 lần.' },
        { w: 'Tuần 10–12', t: 'Nửa đường tự lực', kg: '{bw0.3}', sets: 4, reps: '6–8', d: 'Nghỉ 2 phút giữa các hiệp nếu cần.' },
        { w: 'Tháng 4', t: 'Gần tự lực', kg: '{bw0.2}', sets: 4, reps: '6', d: 'Không đung đưa, không đá chân.' },
        { w: 'Tháng 5', t: 'Hỗ trợ rất nhẹ', kg: '{bw0.1}', sets: 3, reps: '5–6', d: 'Thử 1 lần không hỗ trợ ở cuối buổi.' },
        { w: 'Tháng 6+', t: 'Hít xà tự lực', kg: '0', sets: 3, reps: '3–5', d: 'Rút chốt tạ hỗ trợ. Đạt được là cột mốc lớn!' }
    ],
    'assisted-dip': [
        { w: 'Tuần 1', t: 'Lên xuống máy an toàn', kg: '{bw0.6}', sets: 2, reps: '8', d: 'Hạ tới khuỷu 90°. Xong hiệp bước xuống từng chân rồi mới buông tay.' },
        { w: 'Tuần 2–3', t: 'Đủ 3 hiệp', kg: '{bw0.6}', sets: 3, reps: '10', d: 'Vai hạ xa tai suốt bài.' },
        { w: 'Tuần 4–6', t: 'Giảm hỗ trợ lần 1', kg: '{bw0.45}', sets: 3, reps: '10', d: '' },
        { w: 'Tuần 7–9', t: 'Giảm hỗ trợ lần 2', kg: '{bw0.3}', sets: 3, reps: '10', d: '' },
        { w: 'Tuần 10–14', t: 'Gần tự lực', kg: '{bw0.15}', sets: 3, reps: '8', d: '' },
        { w: 'Tháng 4+', t: 'Nhúng xà không hỗ trợ', kg: '0', sets: 3, reps: '5+', d: 'Rút chốt tạ hỗ trợ.' }
    ],
    'pec-deck': [
        { w: 'Tuần 1', t: 'Làm quen máy', kg: '{bw0.2}', sets: 2, reps: '15', d: 'Tay nắm ngang ngực, không mở tay quá rộng.' },
        { w: 'Tuần 2–3', t: 'Vững tư thế', kg: '{bw0.25}', sets: 3, reps: '15', d: 'Ép 1 giây, siết 1 giây, mở 3 giây.' },
        { w: 'Tuần 4–5', t: 'Tăng tạ lần 1', kg: '{bw0.3}', sets: 3, reps: '12', d: '' },
        { w: 'Tuần 6–8', t: 'Tăng tạ lần 2', kg: '{bw0.35}', sets: 3, reps: '12', d: '' },
        { w: 'Tuần 9–12', t: 'Ngực khoẻ rõ', kg: '{bw0.45}', sets: 3, reps: '10–12', d: 'Siết 2 giây mỗi lần.' },
        { w: 'Tháng 4+', t: 'Mục tiêu dài hạn', kg: '{bw0.55}', sets: 3, reps: '10', d: '' }
    ],
    'machine-curl': [
        { w: 'Tuần 1', t: 'Làm quen máy TGP-340', kg: '{bw0.1}', sets: 2, reps: '12', d: 'Khuỷu thẳng trục xoay, không nhấc mông.' },
        { w: 'Tuần 2–3', t: 'Vững tư thế', kg: '{bw0.12}', sets: 3, reps: '12', d: 'Hạ chậm 3 giây.' },
        { w: 'Tuần 4–5', t: 'Tăng tạ lần 1', kg: '{bw0.15}', sets: 3, reps: '12', d: '' },
        { w: 'Tuần 6–8', t: 'Tăng tạ lần 2', kg: '{bw0.2}', sets: 3, reps: '10–12', d: '' },
        { w: 'Tuần 9–12', t: 'Bắp tay rõ nét', kg: '{bw0.25}', sets: 3, reps: '10', d: 'Siết 1 giây ở trên.' },
        { w: 'Tháng 4+', t: 'Mục tiêu dài hạn', kg: '{bw0.3}', sets: 3, reps: '10', d: '' }
    ],
    'lat-pulldown': [
        { w: 'Tuần 1', t: 'Làm quen máy', kg: '{bw0.3}', sets: 2, reps: '12', d: 'Kéo thanh xuống TRƯỚC mặt, không giật người.' },
        { w: 'Tuần 2–3', t: 'Vững tư thế', kg: '{bw0.35}', sets: 3, reps: '12', d: 'Hạ vai trước rồi mới kéo.' },
        { w: 'Tuần 4–6', t: 'Tăng tạ lần 1', kg: '{bw0.45}', sets: 3, reps: '10–12', d: '' },
        { w: 'Tuần 7–10', t: 'Tăng tạ lần 2', kg: '{bw0.55}', sets: 3, reps: '10', d: '' },
        { w: 'Tuần 11–16', t: 'Lưng rộng rõ', kg: '{bw0.7}', sets: 3, reps: '8–10', d: '' },
        { w: 'Tháng 5+', t: 'Mục tiêu dài hạn', kg: '{bw0.85}', sets: 3, reps: '8', d: 'Không ngả người quá 15°.' }
    ],
    'chest-press': [
        { w: 'Tuần 1', t: 'Làm quen máy', kg: '{bw0.25}', sets: 2, reps: '12', d: 'Tay cầm ngang giữa ngực.' },
        { w: 'Tuần 2–3', t: 'Vững tư thế', kg: '{bw0.3}', sets: 3, reps: '12', d: 'Đưa về chậm 3 giây.' },
        { w: 'Tuần 4–6', t: 'Tăng tạ lần 1', kg: '{bw0.4}', sets: 3, reps: '10–12', d: '' },
        { w: 'Tuần 7–10', t: 'Tăng tạ lần 2', kg: '{bw0.5}', sets: 3, reps: '10', d: '' },
        { w: 'Tuần 11–16', t: 'Ngực khoẻ rõ', kg: '{bw0.65}', sets: 3, reps: '8–10', d: '' },
        { w: 'Tháng 5+', t: 'Mục tiêu dài hạn', kg: '{bw0.8}', sets: 3, reps: '8', d: '' }
    ],
    'seated-row': [
        { w: 'Tuần 1', t: 'Làm quen máy', kg: '{bw0.3}', sets: 2, reps: '12', d: 'Lưng thẳng, ép bả vai mỗi lần.' },
        { w: 'Tuần 2–3', t: 'Vững tư thế', kg: '{bw0.35}', sets: 3, reps: '12', d: '' },
        { w: 'Tuần 4–6', t: 'Tăng tạ lần 1', kg: '{bw0.45}', sets: 3, reps: '10–12', d: '' },
        { w: 'Tuần 7–10', t: 'Tăng tạ lần 2', kg: '{bw0.55}', sets: 3, reps: '10', d: '' },
        { w: 'Tuần 11–16', t: 'Lưng dày rõ', kg: '{bw0.7}', sets: 3, reps: '8–10', d: '' },
        { w: 'Tháng 5+', t: 'Mục tiêu dài hạn', kg: '{bw0.85}', sets: 3, reps: '8', d: 'Không gù lưng khi trả tạ.' }
    ],
    'leg-press': [
        { w: 'Tuần 1', t: 'Làm quen máy', kg: '{bw0.6}', sets: 2, reps: '15', d: 'Chưa tính bàn trượt. Không khoá gối.' },
        { w: 'Tuần 2–3', t: 'Vững tư thế', kg: '{bw0.8}', sets: 3, reps: '15', d: 'Hạ tới gối 90°.' },
        { w: 'Tuần 4–6', t: 'Tăng tạ lần 1', kg: '{bw1}', sets: 3, reps: '12', d: '' },
        { w: 'Tuần 7–10', t: 'Tăng tạ lần 2', kg: '{bw1.3}', sets: 3, reps: '12', d: '' },
        { w: 'Tuần 11–16', t: 'Chân khoẻ rõ', kg: '{bw1.6}', sets: 3, reps: '10', d: '' },
        { w: 'Tháng 5+', t: 'Mục tiêu dài hạn', kg: '{bw2}', sets: 3, reps: '10', d: 'Mông không cuộn khỏi ghế.' }
    ]
};


// --- Ảnh minh hoạ (img/ex/<img>-0.jpg & -1.jpg, ảnh từ free-exercise-db, Unlicense) + video YouTube ---
const EX_MEDIA = {
    'pri13-pullup': { yt: 'qEqNik0ILRU' }, // không có ảnh đúng máy → chỉ có video
    'pec-deck': { img: 'pec-deck', yt: 'GIgoggFOHjs' },
    'assisted-dip': { img: 'assisted-dip', yt: 'huAAKl2rQDM' },
    'chest-press': { img: 'chest-press', yt: 'saiWPVjGD0M' },
    'push-up': { img: 'push-up', yt: 'PG6-_hBZCSc' },
    'machine-curl': { img: 'machine-curl', yt: '7dCd6s32X7I' },
    'db-curl': { img: 'db-curl', yt: 'UnaxzTAPPA0' },
    'hammer-curl': { img: 'hammer-curl', yt: 'JxK_KTiTurw' },
    'lat-pulldown': { img: 'lat-pulldown', yt: 'M3FFZUHijow' },
    'seated-row': { img: 'seated-row', yt: 'VdNyiNi91sw' },
    'leg-press': { img: 'leg-press', yt: '1HzPDRu3U4c' },
    'db-shoulder-press': { img: 'db-shoulder-press', yt: '0I10wx3fg3c' },
    'db-lateral': { img: 'db-lateral', yt: 'IovQD8PvCyA' },
    'db-triceps': { img: 'db-triceps', yt: 'R-VZMj41ceU' },
    'db-row': { img: 'db-row', yt: 'Zv-9i9xvVZk' },
    'db-goblet-squat': { img: 'db-goblet-squat', yt: 'HBUyn9dXKZU' }
};
const ROUTINE_VIDEO = { warmup: 'sWurttqIG60', cooldown: 'OK4wxCMJOf0' };
const STEP_MEDIA = {
    'Xoay cổ chân trái': { img: 'ankle-circles', yt: 'mzTQGYGI0Ng' },
    'Xoay cổ chân phải': { img: 'ankle-circles', yt: 'mzTQGYGI0Ng' },
    'Gập – duỗi cổ chân': { yt: 'mzTQGYGI0Ng' },
    'Nhón gót 2 chân': { img: 'calf-raise', yt: 'rynHywMM6hA' },
    'Đi bằng mũi chân': { yt: '2djYTirXUj4' },
    'Đi bằng gót chân': { yt: 'h4V7X5ZDnU0' },
    'Gối chạm tường – trái': { yt: 'ElrpduJn92Y' },
    'Gối chạm tường – phải': { yt: 'ElrpduJn92Y' },
    'Đá chân trước – sau': { yt: 'naW8u72lOzI' },
    'Nhún nhảy nhẹ tại chỗ': { img: 'pogo', yt: 'j0nl5dWuqN4' },
    'Giãn bắp chân trái (gối thẳng)': { img: 'calf-stretch', yt: '2_2GMXTc1BE' },
    'Giãn bắp chân phải (gối thẳng)': { img: 'calf-stretch', yt: '2_2GMXTc1BE' },
    'Giãn cơ dép trái (gối chùng)': { img: 'soleus-stretch', yt: 'si9ZbZ9XVlk' },
    'Giãn cơ dép phải (gối chùng)': { img: 'soleus-stretch', yt: 'si9ZbZ9XVlk' },
    'Giãn đùi trước': { yt: 'aNXGOpP37CY' },
    'Giãn đùi sau': { img: 'hamstring-stretch', yt: 'LVY692zJK0A' }
};
