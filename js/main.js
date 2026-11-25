
import { db } from "../firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


console.log("마음결 main.js 실행");

// ==========================================
// 기본 요소
// ==========================================

const todayDate = document.getElementById("todayDate");
const pageTitle = document.getElementById("pageTitle");
const pageContent = document.getElementById("pageContent");
const menuItems = document.querySelectorAll(".menu-item");

const pageNames = {
    dashboard: "대시보드",
    record: "감정 기록",
    history: "기록 조회",
    analysis: "월별 분석"
};

const recordsCollection = collection(db, "emotionRecords");

// 현재 조회 중인 기록 데이터
let currentRecords = [];

// ==========================================
// 날짜 처리
// ==========================================

function getLocalDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getLocalMonth() {
    return getLocalDate().slice(0, 7);
}

function updateTodayDate() {
    const today = new Date();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    todayDate.textContent =
        `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${weekdays[today.getDay()]})`;
}

updateTodayDate();

// ==========================================
// HTML 특수문자 처리
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[char];
    });
}

// ==========================================
// 감정 점수별 이모티콘
// ==========================================

function getEmotionEmoji(type, score) {

    const emojis = {
        good: ["😐", "🙂", "😊", "😁", "🥰"],
        bad: ["😕", "😟", "😢", "😣", "🤬"]
    };

    return emojis[type]?.[Number(score) - 1] || "";
}

// ==========================================
// 화면 전환
// ==========================================

function changePage(page) {

    menuItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });

    pageTitle.textContent = pageNames[page];

    if (page === "dashboard") showDashboard();
    if (page === "record") showRecordForm();
    if (page === "history") showHistory();
    if (page === "analysis") showAnalysis();
}

// ==========================================
// 대시보드
// ==========================================


async function showDashboard() {

    pageContent.innerHTML = `
        <div class="welcome-section">
            <h3>마음의 변화를 기록해 보세요.</h3>
            <p>
                작은 표정과 행동 하나에도 마음을 이해할 수 있는 단서가 있습니다.
            </p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <p>이번 달 기록</p>
                <strong id="totalRecords">0건</strong>
            </div>

            <div class="summary-card good-card">
                <p>좋음 평균</p>
                <strong id="goodAverage">-</strong>
            </div>

            <div class="summary-card bad-card">
                <p>나쁨 평균</p>
                <strong id="badAverage">-</strong>
            </div>
        </div>

        <div class="content-card">
            <div class="card-header">
                <h3>최근 감정 기록</h3>
            </div>

            <div id="recentRecords" class="empty-state">
                기록을 불러오는 중입니다.
            </div>
        </div>
    `;

    try {
        const snapshot = await getDocs(recordsCollection);

        const allRecords = snapshot.docs
            .map(document => ({
                id: document.id,
                ...document.data()
            }))
            .sort((a, b) => {
                if (a.date !== b.date) {
                    return (b.date || "").localeCompare(a.date || "");
                }

                return (b.createdAt?.seconds || 0) -
                       (a.createdAt?.seconds || 0);
            });

        // 이번 달 기록
        const currentMonth = getLocalMonth();

        const monthlyRecords = allRecords.filter(record =>
            record.date?.startsWith(currentMonth)
        );

        const totalCount = monthlyRecords.length;

        document.getElementById("totalRecords").textContent =
            `${totalCount}건`;

        if (totalCount > 0) {

            const goodRecords = monthlyRecords.filter(
    record => record.goodScore != null
);

const badRecords = monthlyRecords.filter(
    record => record.badScore != null
);

const goodAverage = goodRecords.length
    ? (
        goodRecords.reduce(
            (sum, record) => sum + Number(record.goodScore), 0
        ) / goodRecords.length
    ).toFixed(2)
    : "-";

const badAverage = badRecords.length
    ? (
        badRecords.reduce(
            (sum, record) => sum + Number(record.badScore), 0
        ) / badRecords.length
    ).toFixed(2)
    : "-";

            document.getElementById("goodAverage").textContent =
    goodAverage === "-" ? "-" : `${goodAverage}점`;

document.getElementById("badAverage").textContent =
    badAverage === "-" ? "-" : `${badAverage}점`;
        }

        // 최근 기록 5건
        const recentRecords = allRecords.slice(0, 5);
        const recentContainer = document.getElementById("recentRecords");

        if (recentRecords.length === 0) {
            recentContainer.innerHTML = `
                아직 등록된 기록이 없습니다.
            `;
            return;
        }

        recentContainer.className = "";

        recentContainer.innerHTML = recentRecords.map(record => `
            <div class="history-item">
                <div class="history-item-top">
                    <div>
                        <span class="history-date">
                            ${escapeHTML(record.date || "")}
                        </span>
                        <h4>${escapeHTML(record.activity || "")}</h4>
                    </div>
                </div>

                <div class="history-scores">

    <div class="history-score good-score">
        <span>좋음</span>
        <strong>${record.goodScore == null ? "-" : getEmotionEmoji("good", record.goodScore) + " " + escapeHTML(record.goodScore) + "점"}</strong>
    </div>

    <div class="history-score bad-score">
        <span>나쁨</span>
        <strong>${record.badScore == null ? "-" : getEmotionEmoji("bad", record.badScore) + " " + escapeHTML(record.badScore) + "점"}</strong>
    </div>

</div>

                ${record.memo ? `
                    <p class="history-memo">
                        ${escapeHTML(record.memo)}
                    </p>
                ` : ""}
            </div>
        `).join("");

    } catch (error) {
        console.error("대시보드 데이터 불러오기 오류:", error);

        document.getElementById("recentRecords").textContent =
            "기록을 불러오지 못했습니다.";
    }
}


// ==========================================
// 감정 기록 입력
// ==========================================


function showRecordForm() {

    pageContent.innerHTML = `
        <div class="content-card record-card">

            <div class="card-header">
                <div>
                    <h3>새로운 감정 기록</h3>
                    <p class="form-description">
                        활동 중 관찰된 감정 표현을 기록해 주세요.
                    </p>
                </div>
            </div>

            <form id="emotionForm">

                <div class="form-group">
                    <label for="recordDate">① 날짜</label>
                    <input type="date" id="recordDate"
                        value="${getLocalDate()}" required>
                </div>

                <div class="form-group">
                    <label for="activityName">② 활동명</label>
                    <input type="text" id="activityName"
                        placeholder="예: 산책, 카페, 음악 감상"
                        maxlength="100" required>
                </div>

                <div class="emotion-group" id="emotionGroup">
                    <label>③ 감정 표현 선택</label>
                    <p>관찰된 감정 표현에 따라 하나만 선택해 주세요.</p>

                    <div class="emotion-type-options">
                        <label class="emotion-type-option good-type">
                            <input type="radio" name="emotionType"
                                value="good" required>
                            <span>좋음</span>
                        </label>

                        <label class="emotion-type-option bad-type">
                            <input type="radio" name="emotionType"
                                value="bad" required>
                            <span>나쁨</span>
                        </label>
                    </div>

                    <p>④ 감정 표현의 정도</p>

                    <div class="score-options">
    ${[1, 2, 3, 4, 5].map(n => `
        <label class="score-option">
            <input type="radio" name="emotionScore"
                value="${n}" required>
            <span class="score-emoji">
                <span class="emoji-good">${getEmotionEmoji("good", n)}</span>
                <span class="emoji-bad">${getEmotionEmoji("bad", n)}</span>
            </span>
            <span class="score-number">${n}점</span>
        </label>
    `).join("")}
</div>
                </div>

                <div class="form-group">
                    <label for="recordMemo">⑤ 비고 및 메모</label>
                    <textarea id="recordMemo" rows="5"
                        placeholder="관찰된 표정, 행동, 상황 등을 기록해 주세요."
                        maxlength="2000"></textarea>
                </div>

                <div id="saveMessage" class="save-message"></div>

                <div class="form-actions">
                    <button type="submit" id="saveButton" class="save-button">
                        기록 저장
                    </button>
                </div>

            </form>
        </div>
    `;

    // 감정 선택에 따라 점수 선택 영역의 스타일 변경
const emotionGroup = document.getElementById("emotionGroup");

document.querySelectorAll('input[name="emotionType"]').forEach(input => {
    input.addEventListener("change", () => {
        emotionGroup.classList.remove("good-group", "bad-group");

        if (input.value === "good") {
            emotionGroup.classList.add("good-group");
        } else {
            emotionGroup.classList.add("bad-group");
        }
    });
});

// 기록 저장
document.getElementById("emotionForm")
    .addEventListener("submit", saveEmotionRecord);
}


// ==========================================
// 기록 저장
// ==========================================


async function saveEmotionRecord(event) {

    event.preventDefault();

    const saveButton = document.getElementById("saveButton");
    const saveMessage = document.getElementById("saveMessage");

    const date = document.getElementById("recordDate").value;
    const activity = document.getElementById("activityName").value.trim();

    const selectedType = document.querySelector(
        'input[name="emotionType"]:checked'
    );

    const selectedScore = document.querySelector(
        'input[name="emotionScore"]:checked'
    );

    const memo = document.getElementById("recordMemo").value.trim();

    if (!date || !activity || !selectedType || !selectedScore) {
        saveMessage.textContent =
            "날짜, 활동명, 감정 표현과 점수를 모두 선택해 주세요.";
        return;
    }

    const emotionType = selectedType.value;
    const emotionScore = Number(selectedScore.value);

    const goodScore = emotionType === "good" ? emotionScore : null;
    const badScore = emotionType === "bad" ? emotionScore : null;

    try {

        saveButton.disabled = true;
        saveButton.textContent = "저장 중...";

        await addDoc(recordsCollection, {
            date,
            activity,
            goodScore,
            badScore,
            memo,
            createdAt: serverTimestamp()
        });

        alert("감정 기록이 저장되었습니다.");

        document.getElementById("emotionForm").reset();
        document.getElementById("recordDate").value = getLocalDate();

        saveMessage.textContent = "";

    } catch (error) {

        console.error("저장 오류:", error);

        saveMessage.textContent =
            "저장에 실패했습니다. Firebase 설정을 확인해 주세요.";

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "기록 저장";

    }
}


// ==========================================
// 기록 조회 화면
// ==========================================

async function showHistory() {

    pageContent.innerHTML = `
        <div class="content-card">

            <div class="history-header">
                <div>
                    <h3>감정 기록 조회</h3>
                    <p class="form-description">
                        월별로 저장된 감정 기록을 확인할 수 있습니다.
                    </p>
                </div>

                <input type="month" id="historyMonth"
                    value="${getLocalMonth()}">
            </div>

            <div id="historyCount" class="history-count">
                기록을 불러오는 중입니다.
            </div>

            <div id="historyList"></div>

        </div>
    `;

    const historyMonth = document.getElementById("historyMonth");

    historyMonth.addEventListener("change", () => {
        renderHistory();
    });

    await renderHistory();
}

// ==========================================
// Firestore 기록 불러오기
// ==========================================

async function renderHistory() {

    const historyList = document.getElementById("historyList");
    const historyCount = document.getElementById("historyCount");
    const historyMonth = document.getElementById("historyMonth");

    if (!historyList) return;

    historyList.innerHTML = `
        <div class="empty-state">기록을 불러오는 중입니다.</div>
    `;

    try {

        const snapshot = await getDocs(recordsCollection);

        const selectedMonth = historyMonth.value;

        currentRecords = snapshot.docs
    .map(document => ({
        id: document.id,
        ...document.data()
    }))
    .filter(record => record.date?.startsWith(selectedMonth))
    .sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }

        return (b.createdAt?.seconds || 0) -
               (a.createdAt?.seconds || 0);
    });

const records = currentRecords;

        historyCount.textContent =
            `총 ${records.length}건의 기록`;

        if (records.length === 0) {

            historyList.innerHTML = `
                <div class="empty-state">
                    선택한 달에 등록된 기록이 없습니다.
                </div>
            `;

            return;
        }

        historyList.innerHTML = records.map(record => `

            <div class="history-item">

                <div class="history-item-top">
    <div>
        <span class="history-date">
            ${escapeHTML(record.date)}
        </span>
        <h4>${escapeHTML(record.activity)}</h4>
    </div>

    <div class="history-actions">
        <button
            type="button"
            class="edit-record-button"
            data-id="${escapeHTML(record.id)}">
            수정
        </button>

        <button
            type="button"
            class="delete-record-button"
            data-id="${escapeHTML(record.id)}">
            삭제
        </button>
    </div>
</div>

                <<div class="history-scores">

    <div class="history-score good-score">
        <span>좋음</span>
        <strong>
            ${record.goodScore == null
                ? "-"
                : getEmotionEmoji("good", record.goodScore) + " " + escapeHTML(record.goodScore) + "점"}
        </strong>
    </div>

    <div class="history-score bad-score">
        <span>나쁨</span>
        <strong>
            ${record.badScore == null
                ? "-"
                : getEmotionEmoji("bad", record.badScore) + " " + escapeHTML(record.badScore) + "점"}
        </strong>
    </div>

</div>

                <div class="history-memo">
                    <span>비고 및 메모</span>
                    <p>${record.memo ? escapeHTML(record.memo) : "작성된 메모가 없습니다."}</p>
                </div>

            </div>

        `).join("");


        // 수정 버튼 이벤트
        historyList.querySelectorAll(".edit-record-button")
            .forEach(button => {
                button.addEventListener("click", () => {
                    editRecord(button.dataset.id);
                });
            });

        // 삭제 버튼 이벤트
        historyList.querySelectorAll(".delete-record-button")
            .forEach(button => {
                button.addEventListener("click", () => {
                    deleteRecord(button.dataset.id);
                });
            });


    } catch (error) {

        console.error("기록 조회 오류:", error);

        historyCount.textContent = "";

        historyList.innerHTML = `
            <div class="empty-state">
                기록을 불러오지 못했습니다.
                Firebase 연결을 확인해 주세요.
            </div>
        `;
    }
}


 // ==========================================
 // 기록 수정 화면
 // ==========================================


function editRecord(recordId) {

    const record = currentRecords.find(item => item.id === recordId);

    console.log("기존 기록 데이터:", record);
console.log("좋음 점수:", record?.goodScore);
console.log("나쁨 점수:", record?.badScore);

    if (!record) {
        alert("수정할 기록을 찾을 수 없습니다.");
        return;
    }

    // 기존 기록의 감정 종류와 점수 확인
    // 구버전 기록은 좋음/나쁨 모두 점수가 있으므로 우선 좋음으로 표시
    // 저장된 점수로 감정 종류와 점수 확인
const emotionType = record.goodScore != null ? "good" : "bad";

const emotionScore = String(
    emotionType === "good"
        ? record.goodScore
        : record.badScore
);
    pageContent.innerHTML = `
        <div class="content-card record-card">

            <div class="card-header">
                <div>
                    <h3>감정 기록 수정</h3>
                    <p class="form-description">
                        기존 기록을 수정할 수 있습니다.
                    </p>
                </div>
            </div>

            <form id="editEmotionForm">

                <div class="form-group">
                    <label for="editRecordDate">① 날짜</label>
                    <input type="date" id="editRecordDate"
                        value="${escapeHTML(record.date)}" required>
                </div>

                <div class="form-group">
                    <label for="editActivityName">② 활동명</label>
                    <input type="text" id="editActivityName"
                        value="${escapeHTML(record.activity)}"
                        maxlength="100" required>
                </div>

                <div class="emotion-group ${emotionType === "good" ? "good-group" : "bad-group"}">
                    <label>③ 감정 표현 선택</label>
                    <p>관찰된 감정 표현에 따라 하나만 선택해 주세요.</p>

                    <div class="emotion-type-options">
                        <label class="emotion-type-option good-type">
                            <input type="radio" name="editEmotionType"
                                value="good"
                                ${emotionType === "good" ? "checked" : ""}
                                required>
                            <span>좋음</span>
                        </label>

                        <label class="emotion-type-option bad-type">
                            <input type="radio" name="editEmotionType"
                                value="bad"
                                ${emotionType === "bad" ? "checked" : ""}
                                required>
                            <span>나쁨</span>
                        </label>
                    </div>

                    <p>④ 감정 표현의 정도</p>

                    <div class="score-options">
    ${[1, 2, 3, 4, 5].map(n => `
        <label class="score-option">
            <input type="radio" name="editEmotionScore"
                value="${n}"
                ${Number(emotionScore) === n ? "checked" : ""}
                required>
            <span class="score-emoji">
                <span class="emoji-good">${getEmotionEmoji("good", n)}</span>
                <span class="emoji-bad">${getEmotionEmoji("bad", n)}</span>
            </span>
            <span class="score-number">${n}점</span>
        </label>
    `).join("")}
</div>
                </div>

                <div class="form-group">
                    <label for="editRecordMemo">⑤ 비고 및 메모</label>
                    <textarea id="editRecordMemo"
                        rows="5" maxlength="2000">${escapeHTML(record.memo || "")}</textarea>
                </div>

                <div class="form-actions edit-form-actions">
                    <button type="button" id="cancelEditButton"
                        class="cancel-button">취소</button>

                    <button type="submit" id="updateButton"
                        class="save-button">수정 저장</button>
                </div>

            </form>
        </div>
    `;

    document.getElementById("cancelEditButton")
        .addEventListener("click", showHistory);

    document.getElementById("editEmotionForm")
        .addEventListener("submit", async event => {

            event.preventDefault();

            const updateButton = document.getElementById("updateButton");

            const selectedType = document.querySelector(
                'input[name="editEmotionType"]:checked'
            );

            const selectedScore = document.querySelector(
                'input[name="editEmotionScore"]:checked'
            );

            if (!selectedType || !selectedScore) {
                alert("감정 표현과 점수를 선택해 주세요.");
                return;
            }

            const emotionScore = Number(selectedScore.value);

            const updatedData = {
                date: document.getElementById("editRecordDate").value,
                activity: document.getElementById("editActivityName").value.trim(),

                goodScore: selectedType.value === "good"
                    ? emotionScore : null,

                badScore: selectedType.value === "bad"
                    ? emotionScore : null,

                memo: document.getElementById("editRecordMemo").value.trim()
            };

            if (!updatedData.date || !updatedData.activity) {
                alert("날짜와 활동명을 입력해 주세요.");
                return;
            }

            try {

                updateButton.disabled = true;
                updateButton.textContent = "수정 중...";

                await updateDoc(
                    doc(db, "emotionRecords", recordId),
                    updatedData
                );

                alert("기록이 수정되었습니다.");

                await showHistory();

            } catch (error) {

                console.error("기록 수정 오류:", error);
                alert("기록 수정에 실패했습니다.");

                updateButton.disabled = false;
                updateButton.textContent = "수정 저장";
            }
        });
}



// ==========================================
// 기록 삭제
// ==========================================

async function deleteRecord(recordId) {

    const confirmed = confirm(
        "이 감정 기록을 삭제하시겠습니까?\n삭제한 기록은 복구할 수 없습니다."
    );

    if (!confirmed) return;

    try {

        await deleteDoc(
            doc(db, "emotionRecords", recordId)
        );

        alert("기록이 삭제되었습니다.");

        await renderHistory();

    } catch (error) {

        console.error("기록 삭제 오류:", error);
        alert("기록 삭제에 실패했습니다.");

    }
}


// ==========================================
// 월별 분석 (다음 단계에서 구현)
// ==========================================


async function showAnalysis() {

    const currentMonth = getLocalMonth();

    pageContent.innerHTML = `
        <div class="content-card">
            <div class="history-header">
                <div>
                    <h3>월별 감정 분석</h3>
                    <p class="form-description">
                        선택한 달의 감정 표현 기록을 분석합니다.
                    </p>
                </div>

                <input
                    type="month"
                    id="analysisMonth"
                    value="${currentMonth}"
                >
            </div>

            <div id="analysisContent">
                <p class="empty-state">분석 자료를 불러오는 중입니다.</p>
            </div>
        </div>
    `;

    const monthInput = document.getElementById("analysisMonth");

    monthInput.addEventListener("change", () => {
        renderAnalysis(monthInput.value);
    });

    await renderAnalysis(currentMonth);
}



async function renderAnalysis(selectedMonth) {

    const analysisContent = document.getElementById("analysisContent");

    try {
        const snapshot = await getDocs(recordsCollection);

        const records = snapshot.docs
            .map(document => document.data())
            .filter(record => record.date?.startsWith(selectedMonth));

        if (records.length === 0) {
            analysisContent.innerHTML = `
                <p class="empty-state">
                    선택한 달에는 기록이 없습니다.
                </p>
            `;
            return;
        }

        const totalCount = records.length;

        console.table(records.map(record => ({
    date: record.date,
    activity: record.activity,
    goodScore: record.goodScore,
    badScore: record.badScore
})));

        // 실제 선택된 감정 점수만 계산
        const goodRecords = records.filter(record => record.goodScore != null);
        const badRecords = records.filter(record => record.badScore != null);

        const goodAverage = goodRecords.length
            ? (goodRecords.reduce((sum, record) => sum + Number(record.goodScore), 0)
                / goodRecords.length).toFixed(2)
            : "-";

        const badAverage = badRecords.length
            ? (badRecords.reduce((sum, record) => sum + Number(record.badScore), 0)
                / badRecords.length).toFixed(2)
            : "-";

        // 활동별 점수 집계
        const activityMap = {};

        records.forEach(record => {

            if (!activityMap[record.activity]) {
                activityMap[record.activity] = {
                    count: 0,
                    goodTotal: 0,
                    goodCount: 0,
                    badTotal: 0,
                    badCount: 0
                };
            }

            const item = activityMap[record.activity];

            item.count++;

            if (record.goodScore != null) {
                item.goodTotal += Number(record.goodScore);
                item.goodCount++;
            }

            if (record.badScore != null) {
                item.badTotal += Number(record.badScore);
                item.badCount++;
            }
        });

        const activities = Object.entries(activityMap).map(([name, item]) => ({
            name,
            count: item.count,
            goodAverage: item.goodCount
                ? item.goodTotal / item.goodCount
                : null,
            badAverage: item.badCount
                ? item.badTotal / item.badCount
                : null
        }));

        // 실제 점수가 있는 활동만 비교
        const goodActivities = activities.filter(item => item.goodAverage !== null);
        const badActivities = activities.filter(item => item.badAverage !== null);

        goodActivities.sort((a, b) => b.goodAverage - a.goodAverage);
        badActivities.sort((a, b) => b.badAverage - a.badAverage);

        const bestActivity = goodActivities[0];
        const worstActivity = badActivities[0];

        analysisContent.innerHTML = `
            <div class="summary-cards">

                <div class="summary-card">
                    <span>전체 기록</span>
                    <strong>${totalCount}건</strong>
                </div>

                <div class="summary-card">
                    <span>좋음 평균</span>
                    <strong>${goodAverage === "-" ? "-" : goodAverage + "점"}</strong>
                </div>

                <div class="summary-card">
                    <span>나쁨 평균</span>
                    <strong>${badAverage === "-" ? "-" : badAverage + "점"}</strong>
                </div>

            </div>

            <div class="analysis-section">
                <h3>활동별 감정 비교</h3>

                ${activities.map(item => `
                    <div class="activity-analysis">
                        <div class="activity-analysis-header">
                            <strong>${escapeHTML(item.name)}</strong>
                            <span>${item.count}건</span>
                        </div>

                        <div class="analysis-score">
                            <span>좋음</span>
                            <div class="analysis-bar good-bar">
                                <div style="width:${item.goodAverage === null ? 0 : item.goodAverage / 5 * 100}%"></div>
                            </div>
                            <strong>${item.goodAverage === null ? "-" : item.goodAverage.toFixed(2)}</strong>
                        </div>

                        <div class="analysis-score">
                            <span>나쁨</span>
                            <div class="analysis-bar bad-bar">
                                <div style="width:${item.badAverage === null ? 0 : item.badAverage / 5 * 100}%"></div>
                            </div>
                            <strong>${item.badAverage === null ? "-" : item.badAverage.toFixed(2)}</strong>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="analysis-section">
                <h3>활동별 분석</h3>

                <p>
                    좋음 평균이 가장 높은 활동:
                    <strong>${bestActivity ? escapeHTML(bestActivity.name) : "-"}</strong>
                    ${bestActivity ? `(${bestActivity.goodAverage.toFixed(2)}점)` : ""}
                </p>

                <p>
                    나쁨 평균이 가장 높은 활동:
                    <strong>${worstActivity ? escapeHTML(worstActivity.name) : "-"}</strong>
                    ${worstActivity ? `(${worstActivity.badAverage.toFixed(2)}점)` : ""}
                </p>
            </div>
        `;

    } catch (error) {
        console.error("월별 분석 오류:", error);

        analysisContent.innerHTML = `
            <p class="empty-state">
                분석 자료를 불러오지 못했습니다.
            </p>
        `;
    }
}



// ==========================================
// 메뉴 이벤트
// ==========================================

menuItems.forEach(item => {

    item.addEventListener("click", () => {
        changePage(item.dataset.page);
    });

});

// ==========================================
// 초기 화면
// ==========================================

changePage("analysis");
