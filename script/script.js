const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const guiToggle = document.getElementById('guiToggle');
const sidebarWrapper = document.getElementById('sidebarWrapper');
const sidebar = document.getElementById('sidebar');
const clothingPreview = document.getElementById('clothingPreview');
const categoryBtns = document.querySelectorAll('.category-btn');

let pose, stream;
let processing = false;
let currentCategory = 'tshirts';
let currentClothingIndex = 0;
let guiVisible = true;

const clothingDatabase = {
    tshirts: [
        { name: 'Футболка', src: 'img/tshirts/tshirt.png' },
        { name: 'Футболка', src: 'img/tshirts/tshirt1.png' },
        { name: 'Футболка', src: 'img/tshirts/tshirt2.png' },
        { name: 'Футболка', src: 'img/tshirts/tshirt3.png' },
        { name: 'Футболка', src: 'img/tshirts/tshirt4.png' }
    ],
    tanktop: [
        { name: 'Безрукавка', src: 'img/tanktop/tanktop.png' },
        { name: 'Безрукавка', src: 'img/tanktop/tanktop1.png' },
        { name: 'Безрукавка', src: 'img/tanktop/tanktop2.png' },
        { name: 'Безрукавка', src: 'img/tanktop/tanktop3.png' },
        { name: 'Безрукавка', src: 'img/tanktop/tanktop4.png' }
    ],
    hoodie: [
        { name: 'Худи', src: 'img/hoodie/hoodie.png' },
        { name: 'Худи', src: 'img/hoodie/hoodie1.png' },
        { name: 'Худи', src: 'img/hoodie/hoodie2.png' },
        { name: 'Худи', src: 'img/hoodie/hoodie3.png' },
        { name: 'Худи', src: 'img/hoodie/hoodie4.png' }
    ]
};

const clothingImages = {};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

function loadImg() {
    Object.keys(clothingDatabase).forEach(category => {
        clothingImages[category] = [];
        clothingDatabase[category].forEach((item, index) => {
            const img = new Image();
            img.src = item.src;
            clothingImages[category][index] = img;
        });
    });
}

function makePreview(category) {
    clothingPreview.innerHTML = '';
    
    clothingDatabase[category].forEach((item, index) => {
        const preview = document.createElement('div');
        preview.className = 'preview-item' + (index === 0 && category === currentCategory ? ' active' : '');
        
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.name;
        
        img.onerror = () => {
            preview.style.background = '#252525';
            img.style.opacity = '0.3';
        };
        
        preview.appendChild(img);
        preview.addEventListener('click', () => pickItem(index));
        clothingPreview.appendChild(preview);
    });
}

function pickItem(index) {
    currentClothingIndex = index;
    document.querySelectorAll('.preview-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

function swCat(category) {
    currentCategory = category;
    currentClothingIndex = 0;
    
    categoryBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    makePreview(category);
}

guiToggle.addEventListener('click', () => {
    guiVisible = !guiVisible;
    
    if (guiVisible) {
        sidebarWrapper.classList.remove('hidden');
        clothingPreview.classList.remove('hidden');
    } else {
        sidebarWrapper.classList.add('hidden');
        clothingPreview.classList.add('hidden');
    }
});


categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        swCat(btn.dataset.category);
    });
});

function render(landmarks) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const leS = landmarks[11];
    const riS = landmarks[12];
    const leH = landmarks[23];
    const riH = landmarks[24];
    
    const currentImg = clothingImages[currentCategory]?.[currentClothingIndex];
    
    if (leS?.visibility > 0.5 && riS?.visibility > 0.5 &&
        leH?.visibility > 0.5 && riH?.visibility > 0.5 && 
        currentImg?.complete) {
        
        const lsX = leS.x * canvas.width;
        const lsY = leS.y * canvas.height;
        const rsX = riS.x * canvas.width;
        const rsY = riS.y * canvas.height;
        const lhX = leH.x * canvas.width;
        const lhY = leH.y * canvas.height;
        const rhX = riH.x * canvas.width;
        const rhY = riH.y * canvas.height;
        
        const centerX = (lsX + rsX) / 2;
        const centerY = (lsY + rsY) / 2;
        const shoulderWidth = Math.sqrt(Math.pow(rsX - lsX, 2) + Math.pow(rsY - lsY, 2));
        
        let widthMultiplier = 2.2;
        let heightMultiplier = 1.8;
        
        if (currentCategory === 'jackets') {
            widthMultiplier = 2.4;
            heightMultiplier = 2.0;
        } else if (currentCategory === 'sweaters') {
            widthMultiplier = 2.3;
            heightMultiplier = 2.2;
        }
        
        const shirtWidth = shoulderWidth * widthMultiplier;
        const torsoLength = Math.sqrt(Math.pow((lhX + rhX)/2 - centerX, 2) + 
                                      Math.pow((lhY + rhY)/2 - centerY, 2));
        const shirtHeight = torsoLength * heightMultiplier;
        const isFacingCamera = lsX > rsX;
        let angle = Math.atan2(rsY - lsY, rsX - lsX);
        
        ctx.save();
        ctx.translate(centerX, centerY + shirtHeight/3);
        
        if (isFacingCamera) {
            ctx.rotate(angle + Math.PI);
            ctx.scale(-1, 1);
            ctx.drawImage(currentImg, -shirtWidth/2, -shirtHeight/2, shirtWidth, shirtHeight);
        } else {
            ctx.rotate(angle);
            ctx.drawImage(currentImg, -shirtWidth/2, -shirtHeight/2, shirtWidth, shirtHeight);
        }
        
        ctx.restore();
    }
}

async function start() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = () => video.play().then(r));
        
        pose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        pose.onResults(r => {
            if (r.poseLandmarks) render(r.poseLandmarks);
            processing = false;
        });
        
        function loop() {
            if (video.readyState === 4 && !processing) {
                processing = true;
                pose.send({ image: video });
            }
            requestAnimationFrame(loop);
        }
        loop();
        
    } catch (e) {
        console.log('Ошибка:', e);
    }
}

loadImg();
makePreview('tshirts');
start();

window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
});