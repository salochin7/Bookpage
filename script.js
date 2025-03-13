// Handle file import button
document.getElementById('fileButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

// Import bookmarks
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(e.target.result, 'text/html');
        const links = doc.querySelectorAll('a');

        const defaultCategory = "Imported Bookmarks";

        chrome.storage.local.get('savedBookmarks', function (data) {
            let bookmarks = data.savedBookmarks || {};

            // Ensure default category exists
            if (!bookmarks[defaultCategory]) bookmarks[defaultCategory] = [];

            links.forEach(link => {
                const bookmarkData = {
                    url: link.href,
                    title: link.textContent || link.href
                };

                // Avoid duplicates
                const urlExists = Object.values(bookmarks).some(category =>
                    category.some(existingBookmark => existingBookmark.url === bookmarkData.url)
                );

                if (!urlExists) bookmarks[defaultCategory].push(bookmarkData);
            });

            chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
                console.log("Bookmarks imported.");
                displayBookmarks();
            });
        });
    };

    reader.readAsText(file);
});

// Function to create a bookmark element
// Function to create a bookmark element with separate link and delete button
// Function to create a bookmark element with drag-and-drop support
// Function to create a bookmark element with drag-and-drop support
function createBookmarkElement(bookmark, category) {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    bookmarkItem.setAttribute('draggable', 'true');

    // Create bookmark link
    const bookmarkText = document.createElement('a');
    bookmarkText.href = bookmark.url;
    bookmarkText.className = 'bookmark-text';
    bookmarkText.textContent = bookmark.title;
    bookmarkText.target = '_blank';

    // Create delete button for bookmark
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = 'X';
    deleteButton.onclick = () => deleteBookmark(category, bookmark.url);

    // Drag start event — save the bookmark data and category
    bookmarkItem.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('bookmark', JSON.stringify(bookmark));
        event.dataTransfer.setData('oldCategory', category);
        bookmarkItem.classList.add('dragging');
    });

    bookmarkItem.addEventListener('dragend', () => {
        bookmarkItem.classList.remove('dragging');
    });

    // Append link and delete button to bookmark item
    bookmarkItem.appendChild(bookmarkText);
    bookmarkItem.appendChild(deleteButton);

    return bookmarkItem;
}

// Enable drag-and-drop functionality for categories
function enableCategoryDrop(categoryContainer, category) {
    categoryContainer.addEventListener('dragover', (event) => event.preventDefault());

    categoryContainer.addEventListener('drop', (event) => {
        event.preventDefault();
        const draggedBookmark = JSON.parse(event.dataTransfer.getData('bookmark'));
        const oldCategory = event.dataTransfer.getData('oldCategory');

        if (oldCategory !== category) {
            moveBookmark(draggedBookmark, oldCategory, category);
        }
    });
}

// Function to move a bookmark between categories
function moveBookmark(bookmark, oldCategory, newCategory) {
    chrome.storage.local.get('savedBookmarks', (data) => {
        const bookmarks = data.savedBookmarks || {};

        if (!Array.isArray(bookmarks[newCategory])) bookmarks[newCategory] = [];
        
        // Remove from old category
        bookmarks[oldCategory] = bookmarks[oldCategory].filter(b => b.url !== bookmark.url);

        // If old category is empty, delete it
        if (bookmarks[oldCategory].length === 0) {
            delete bookmarks[oldCategory];
        }

        // Add to the new category
        bookmarks[newCategory].push(bookmark);

        // Save and refresh
        chrome.storage.local.set({ savedBookmarks: bookmarks }, () => displayBookmarks());
    });
}

// Function to display saved bookmarks and set up categories
function displayBookmarks() {
    chrome.storage.local.get('savedBookmarks', function (data) {
        const bookmarkGrid = document.getElementById('bookmarkGrid');
        bookmarkGrid.innerHTML = ''; // Clear existing bookmarks

        if (!data.savedBookmarks) return;

        // Iterate over the categories
        Object.keys(data.savedBookmarks).forEach((category) => {
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'category-container';

            // Add category title container
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';

            // Create the green "Add Bookmark" button with a plus icon
            const addButton = document.createElement('button');
            addButton.className = 'add-btn';
            addButton.textContent = '+';
            addButton.title = 'Add bookmark to this category';
            addButton.onclick = () => addBookmarkToCategory(category);

            // Add category title
            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category;

            // Add delete button for category
            const deleteCategoryButton = document.createElement('button');
            deleteCategoryButton.className = 'delete-btn';
            deleteCategoryButton.textContent = 'X';
            deleteCategoryButton.onclick = () => deleteCategory(category);

            // Assemble the category header
            categoryHeader.appendChild(addButton);
            categoryHeader.appendChild(categoryTitle);
            categoryHeader.appendChild(deleteCategoryButton);

            categoryContainer.appendChild(categoryHeader);

            // Set up bookmark grid for this category
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'bookmark-grid';

            // Make category droppable
            enableCategoryDrop(categoryContainer, category);

            // Populate the category with bookmarks
            data.savedBookmarks[category].forEach((bookmark) => {
                const bookmarkItem = createBookmarkElement(bookmark, category);
                categoryGrid.appendChild(bookmarkItem);
            });

            categoryContainer.appendChild(categoryGrid);
            bookmarkGrid.appendChild(categoryContainer);
        });

        console.log('Bookmarks loaded!');
    });
}

// Function to add a new bookmark to a category
function addBookmarkToCategory(category) {
    const bookmarkTitle = prompt('Enter bookmark title:');
    const bookmarkUrl = prompt('Enter bookmark URL:');

    if (!bookmarkTitle || !bookmarkUrl) return;

    const newBookmark = { title: bookmarkTitle, url: bookmarkUrl };

    chrome.storage.local.get('savedBookmarks', function (data) {
        let bookmarks = data.savedBookmarks || {};

        // Ensure the category exists
        if (!bookmarks[category]) bookmarks[category] = [];

        bookmarks[category].push(newBookmark);

        chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
            console.log(`New bookmark added to category: ${category}`);
            displayBookmarks();
        });
    });
}

// Ensure bookmarks are displayed when the page loads
document.addEventListener('DOMContentLoaded', () => displayBookmarks());



// Add a new category
document.getElementById('addCategoryButton').addEventListener('click', () => {
    const categoryName = prompt("Enter the new category name:");
    if (!categoryName.trim()) return;

    chrome.storage.local.get('savedBookmarks', function (data) {
        let bookmarks = data.savedBookmarks || {};
        if (bookmarks[categoryName]) return alert("Category already exists!");

        bookmarks[categoryName] = [];
        chrome.storage.local.set({ savedBookmarks: bookmarks }, displayBookmarks);
    });
});

// Delete a bookmark
function deleteBookmark(category, url) {
    chrome.storage.local.get('savedBookmarks', function (data) {
        let bookmarks = data.savedBookmarks || {};
        bookmarks[category] = bookmarks[category].filter(b => b.url !== url);

        chrome.storage.local.set({ savedBookmarks: bookmarks }, displayBookmarks);
    });
}

// Delete a category (only if more than 1 exists)
function deleteCategory(category) {
    chrome.storage.local.get('savedBookmarks', function (data) {
        let bookmarks = data.savedBookmarks || {};
        const categories = Object.keys(bookmarks);

        if (categories.length <= 1) {
            alert("You must keep at least one category.");
            return;
        }

        delete bookmarks[category];
        chrome.storage.local.set({ savedBookmarks: bookmarks }, displayBookmarks);
    });
}

// Load bookmarks on page load
document.addEventListener('DOMContentLoaded', displayBookmarks);


// Add a new category
document.getElementById('addCategoryButton').addEventListener('click', function () {
    const categoryName = prompt("Enter the new category name:");

    if (!categoryName || categoryName.trim() === "") return;

    chrome.storage.local.get('savedBookmarks', function (data) {
        let bookmarks = data.savedBookmarks || {};

        if (bookmarks[categoryName]) {
            alert("Category already exists!");
            return;
        }

        bookmarks[categoryName] = [];
        chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
            console.log("New category added:", categoryName);
            displayBookmarks();
        });
    });
});

// Ensure bookmarks are displayed when the page loads
document.addEventListener('DOMContentLoaded', function () {
    displayBookmarks();

    // Load saved page title
    chrome.storage.local.get('pageTitle', function (data) {
        if (data.pageTitle) {
            document.getElementById('pageTitle').textContent = data.pageTitle;
        }
    });
});

// Handle renaming of the page title
document.getElementById('pageTitle').addEventListener('blur', function () {
    const newTitle = document.getElementById('pageTitle').textContent.trim();
    if (newTitle && newTitle !== 'CUSTOM PAGE') {
        chrome.storage.local.set({ pageTitle: newTitle }, function () {
            console.log("Page title saved:", newTitle);
        });
    }
});
// Function to upload background image
function uploadBackgroundImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        // Save background image to chrome storage
        chrome.storage.local.set({ backgroundImage: e.target.result, backgroundColor: null }, () => {
            document.body.style.backgroundImage = `url(${e.target.result})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
        });
    };
    reader.readAsDataURL(file);
}

// Function to pick background color
function pickBackgroundColor() {
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = '#ffffff'; // Default color (white)
    
    // When the user selects a color
    colorPicker.addEventListener('input', (event) => {
        const selectedColor = event.target.value;
        
        // Save selected color to chrome storage
        chrome.storage.local.set({ backgroundColor: selectedColor, backgroundImage: null }, () => {
            document.body.style.backgroundImage = ''; // Clear any image
            document.body.style.backgroundColor = selectedColor;
        });
    });

    // Trigger the color picker dialog
    colorPicker.click();
}

// Load saved background image or color on page load
function loadBackground() {
    chrome.storage.local.get(['backgroundImage', 'backgroundColor'], (data) => {
        if (data.backgroundImage) {
            document.body.style.backgroundImage = `url(${data.backgroundImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
        } else if (data.backgroundColor) {
            document.body.style.backgroundImage = ''; // Clear any image
            document.body.style.backgroundColor = data.backgroundColor;
        }
    });
}

// Ensure bookmarks and background are displayed when the page loads
document.addEventListener('DOMContentLoaded', () => {
    displayBookmarks();
    loadBackground();

    // Add event listener for background image upload
    const uploadButton = document.getElementById('uploadBackgroundBtn');
    uploadButton.addEventListener('change', uploadBackgroundImage);

    // Add event listener for background color picker
    const colorButton = document.getElementById('pickBackgroundColorBtn');
    colorButton.addEventListener('click', pickBackgroundColor);
});
