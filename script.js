document.addEventListener('DOMContentLoaded', function() {
  // Elementler
  const courseList = document.getElementById('course-list');
  const addCourseBtn = document.getElementById('add-course');
  const undoBtn = document.getElementById('undo-btn');
  const resetAllBtn = document.getElementById('reset-all');
  const saveBtn = document.getElementById('save-btn');
  const totalHoursDisplay = document.getElementById('total-hours-display');
  const generalAverageEl = document.getElementById('general-average');
  const totalLostEl = document.getElementById('total-lost');

  // Veri yapıları
  let deletedCoursesHistory = [];
  let deleteClickCount = 0;
  let deleteTimeout = null;
  const MAX_HISTORY = 10;

  // Sayfa yüklendiğinde verileri çek
  loadCourses();

  // Sürükle-bırak özelliği
  new Sortable(courseList, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: function() {
      updateCourseNumbers();
      calculateAll();
      saveCourses();
    }
  });

  // Olay dinleyicileri
  addCourseBtn.addEventListener('click', addNewCourse);
  undoBtn.addEventListener('click', undoDelete);
  resetAllBtn.addEventListener('click', confirmResetAll);
  saveBtn.addEventListener('click', saveCourses);

  // Çift tıkla silme mekanizması
  courseList.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
      const row = e.target.closest('tr');
      deleteClickCount++;
      
      if (deleteClickCount === 1) {
        row.classList.add('delete-warning');
        showToast('Silme işlemini onaylamak için tekrar tıklayın', 'warning');
        
        deleteTimeout = setTimeout(() => {
          deleteClickCount = 0;
          row.classList.remove('delete-warning');
        }, 1500);
      } else if (deleteClickCount === 2) {
        clearTimeout(deleteTimeout);
        deleteCourse(row);
        deleteClickCount = 0;
      }
    }
  });

  // Input değişikliklerini dinle
  courseList.addEventListener('input', function(e) {
    if (e.target.classList.contains('note') || e.target.classList.contains('hours')) {
      calculateAll();
      saveCourses();
    }
  });

  // Sayfa kapanırken verileri kaydet
  window.addEventListener('beforeunload', function(e) {
    saveCourses();
  });

  // Yeni ders ekleme fonksiyonu
  function addNewCourse() {
    const row = document.createElement('tr');
    const courseNumber = courseList.children.length + 1;
    
    row.innerHTML = `
      <td class="drag-handle"><i class="fas fa-grip-lines"></i></td>
      <td class="course-number">${courseNumber}</td>
      <td><input type="text" class="course-name" placeholder="Ders adı"></td>
      <td><input type="number" class="hours" min="1" max="10" value="2"></td>
      <td><input type="number" class="note" data-type="note1" min="0" max="100" placeholder="-"></td>
      <td><input type="number" class="note" data-type="note2" min="0" max="100" placeholder="-"></td>
      <td><input type="number" class="note" data-type="perf1" min="0" max="100" placeholder="-"></td>
      <td><input type="number" class="note" data-type="perf2" min="0" max="100" placeholder="-"></td>
      <td><input type="number" class="note" data-type="project" min="0" max="100" placeholder="-"></td>
      <td class="average">-</td>
      <td class="lost-points">-</td>
      <td><button class="delete-btn" title="Dersi sil"><i class="fas fa-times"></i></button></td>
    `;
    
    courseList.appendChild(row);
    calculateAll();
    saveCourses();
  }

  // Ders silme fonksiyonu
  // Ders silme fonksiyonu (Güncellendi)
function deleteCourse(row) {
  if (courseList.children.length > 1) {
    // Silinen dersin TÜM verilerini kaydet
    const courseData = {
      html: row.innerHTML,
      index: Array.from(courseList.children).indexOf(row),
      name: row.querySelector('.course-name').value,
      hours: row.querySelector('.hours').value,
      notes: {
        note1: row.querySelector('[data-type="note1"]').value,
        note2: row.querySelector('[data-type="note2"]').value,
        perf1: row.querySelector('[data-type="perf1"]').value,
        perf2: row.querySelector('[data-type="perf2"]').value,
        project: row.querySelector('[data-type="project"]').value
      }
    };

    deletedCoursesHistory.push(courseData);
    
    if (deletedCoursesHistory.length > MAX_HISTORY) {
      deletedCoursesHistory.shift();
    }
    
    row.classList.add('deleting');
    setTimeout(() => {
      row.remove();
      updateCourseNumbers();
      calculateAll();
      showToast('Ders silindi. Geri almak için UNDO butonuna tıklayın', 'success');
      updateUndoButton();
      saveCourses();
    }, 300);
  } else {
    showToast('En az bir ders olmalıdır!', 'error');
  }
}

// Geri alma fonksiyonu (Güncellendi)
function undoDelete() {
  if (deletedCoursesHistory.length > 0) {
    const lastDeleted = deletedCoursesHistory.pop();
    const row = document.createElement('tr');
    
    // Orijinal HTML yapısını geri yükle
    row.innerHTML = `
      <td class="drag-handle"><i class="fas fa-grip-lines"></i></td>
      <td class="course-number">${lastDeleted.index + 1}</td>
      <td><input type="text" class="course-name" value="${lastDeleted.name || ''}"></td>
      <td><input type="number" class="hours" min="1" max="10" value="${lastDeleted.hours || '2'}"></td>
      <td><input type="number" class="note" data-type="note1" min="0" max="100" value="${lastDeleted.notes.note1 || ''}"></td>
      <td><input type="number" class="note" data-type="note2" min="0" max="100" value="${lastDeleted.notes.note2 || ''}"></td>
      <td><input type="number" class="note" data-type="perf1" min="0" max="100" value="${lastDeleted.notes.perf1 || ''}"></td>
      <td><input type="number" class="note" data-type="perf2" min="0" max="100" value="${lastDeleted.notes.perf2 || ''}"></td>
      <td><input type="number" class="note" data-type="project" min="0" max="100" value="${lastDeleted.notes.project || ''}"></td>
      <td class="average">-</td>
      <td class="lost-points">-</td>
      <td><button class="delete-btn" title="Dersi sil"><i class="fas fa-times"></i></button></td>
    `;

    // Doğru pozisyona ekle
    if (lastDeleted.index < courseList.children.length) {
      courseList.insertBefore(row, courseList.children[lastDeleted.index]);
    } else {
      courseList.appendChild(row);
    }
    
    // Animasyon ekle
    row.classList.add('undo-animation');
    setTimeout(() => {
      row.classList.remove('undo-animation');
    }, 500);
    
    // Güncellemeleri yap
    updateCourseNumbers();
    calculateAll();
    showToast('Ders geri yüklendi', 'success');
    updateUndoButton();
    saveCourses();
  }
}

  // Tümünü temizle (onaylı)
  function confirmResetAll() {
    if (confirm('Tüm dersleri silmek istediğinize emin misiniz?\n\nNOT: Son 10 silme işlemini GERİ AL butonuyla kurtarabilirsiniz.')) {
      // Mevcut dersleri geçmişe kaydet
      deletedCoursesHistory.push({
        html: courseList.innerHTML,
        index: 0,
        timestamp: Date.now()
      });
      
      courseList.innerHTML = '';
      addNewCourse(); // En az bir ders olsun
      calculateAll();
      showToast('Tüm dersler silindi. Son 10 işlemi GERİ AL butonuyla kurtarabilirsiniz.', 'error');
      updateUndoButton();
      saveCourses();
    }
  }

  // Ders numaralarını güncelle
  function updateCourseNumbers() {
    const rows = courseList.querySelectorAll('tr');
    rows.forEach((row, index) => {
      row.querySelector('.course-number').textContent = index + 1;
    });
  }

  // UNDO butonunu güncelle
  function updateUndoButton() {
    undoBtn.disabled = deletedCoursesHistory.length === 0;
    undoBtn.innerHTML = deletedCoursesHistory.length > 0 
      ? `<i class="fas fa-undo"></i> GERİ AL (${deletedCoursesHistory.length})`
      : '<i class="fas fa-undo"></i> GERİ AL';
  }

  // Not girilmiş mi kontrolü
  function hasGrades(row) {
    const notes = row.querySelectorAll('.note');
    for (let note of notes) {
      if (note.value && parseFloat(note.value) > 0) {
        return true;
      }
    }
    return false;
  }

  // Kayıp puan hesaplama (sadece not girilmiş dersler için)
  function calculateRow(row) {
    const notes = row.querySelectorAll('.note');
    const hoursInput = row.querySelector('.hours');
    const hours = parseFloat(hoursInput.value) || 0;
    
    let sum = 0;
    let count = 0;
    
    notes.forEach(input => {
      const value = parseFloat(input.value);
      if (!isNaN(value) && value >= 0) {
        sum += value;
        count++;
      }
    });
    
    const average = count > 0 ? (sum / count) : 0;
    const totalHours = calculateTotalValidHours();
    const weight = totalHours > 0 ? (hours / totalHours * 100) : 0;
    
    // SADECE not girilmiş dersler için kayıp puan hesapla
    const lostPoints = count > 0 ? (weight * (100 - average) / 100) : 0;
    
    row.querySelector('.average').textContent = average > 0 ? average.toFixed(2) : '-';
    row.querySelector('.lost-points').textContent = lostPoints > 0 ? lostPoints.toFixed(2) : '-';
    
    return { 
      average,
      weight,
      lostPoints,
      hasGrades: count > 0
    };
  }

  // Toplam geçerli ders saatini hesapla
  function calculateTotalValidHours() {
    let total = 0;
    document.querySelectorAll('tr').forEach(row => {
      if (hasGrades(row)) {
        const hours = parseFloat(row.querySelector('.hours').value) || 0;
        total += hours;
      }
    });
    return total;
  }

  // Tüm hesaplamaları yap
  function calculateAll() {
    const rows = courseList.querySelectorAll('tr');
    let totalWeightedAverage = 0;
    let totalLostPoints = 0;
    let totalValidHours = 0;
    let coursesWithGrades = 0;
    
    // Önce toplam geçerli saatleri hesapla
    totalValidHours = calculateTotalValidHours();
    
    // Tüm satırları hesapla
    rows.forEach(row => {
      const result = calculateRow(row);
      if (result.hasGrades && totalValidHours > 0) {
        totalWeightedAverage += result.average * (result.weight / 100);
        totalLostPoints += result.lostPoints;
        coursesWithGrades++;
      }
    });
    
    // Sonuçları güncelle
    totalHoursDisplay.textContent = totalValidHours;
    generalAverageEl.textContent = totalWeightedAverage > 0 ? totalWeightedAverage.toFixed(2) : '-';
    totalLostEl.textContent = totalLostPoints > 0 ? totalLostPoints.toFixed(2) : '0';
  }

  // Dersleri localStorage'a kaydet
  function saveCourses() {
    const courses = [];
    document.querySelectorAll('#course-list tr').forEach(row => {
      courses.push({
        name: row.querySelector('.course-name').value,
        hours: row.querySelector('.hours').value,
        note1: row.querySelector('[data-type="note1"]').value,
        note2: row.querySelector('[data-type="note2"]').value,
        perf1: row.querySelector('[data-type="perf1"]').value,
        perf2: row.querySelector('[data-type="perf2"]').value,
        project: row.querySelector('[data-type="project"]').value,
        average: row.querySelector('.average').textContent,
        lostPoints: row.querySelector('.lost-points').textContent
      });
    });
    
    localStorage.setItem('gradeCalculatorData', JSON.stringify({
      courses: courses,
      deletedHistory: deletedCoursesHistory,
      lastUpdated: new Date().toISOString()
    }));
    
    showToast('Otomatik kaydedildi', 'success');
  }

  // Dersleri localStorage'dan yükle
  function loadCourses() {
    const savedData = localStorage.getItem('gradeCalculatorData');
    if (savedData) {
      const data = JSON.parse(savedData);
      
      // Dersleri yükle
      if (data.courses && data.courses.length > 0) {
        data.courses.forEach(course => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="drag-handle"><i class="fas fa-grip-lines"></i></td>
            <td class="course-number">${courseList.children.length + 1}</td>
            <td><input type="text" class="course-name" placeholder="Ders adı" value="${course.name || ''}"></td>
            <td><input type="number" class="hours" min="1" max="10" value="${course.hours || '2'}"></td>
            <td><input type="number" class="note" data-type="note1" min="0" max="100" placeholder="-" value="${course.note1 || ''}"></td>
            <td><input type="number" class="note" data-type="note2" min="0" max="100" placeholder="-" value="${course.note2 || ''}"></td>
            <td><input type="number" class="note" data-type="perf1" min="0" max="100" placeholder="-" value="${course.perf1 || ''}"></td>
            <td><input type="number" class="note" data-type="perf2" min="0" max="100" placeholder="-" value="${course.perf2 || ''}"></td>
            <td><input type="number" class="note" data-type="project" min="0" max="100" placeholder="-" value="${course.project || ''}"></td>
            <td class="average">${course.average || '-'}</td>
            <td class="lost-points">${course.lostPoints || '-'}</td>
            <td><button class="delete-btn" title="Dersi sil"><i class="fas fa-times"></i></button></td>
          `;
          courseList.appendChild(row);
        });
      } else {
        addNewCourse(); // Varsayılan bir ders ekle
      }
      
      // Silinme geçmişini yükle
      if (data.deletedHistory) {
        deletedCoursesHistory = data.deletedHistory
          .filter(item => Date.now() - new Date(item.timestamp).getTime() < 86400000) // 24 saatten eski olanları temizle
          .slice(0, MAX_HISTORY); // Max 10 kayıt
      }
      
      calculateAll();
      updateUndoButton();
      showToast('Önceki oturumunuz yüklendi', 'success');
    } else {
      // İlk açılışta 3 örnek ders ekle
      for (let i = 0; i < 3; i++) {
        addNewCourse();
      }
    }
  }

  // Toast bildirimi fonksiyonu
  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }, 100);
  }
});