document.getElementById('fileButton').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(e.target.result, 'text/html');
        const links = doc.querySelectorAll('a');

        // Default category name
        const defaultCategory = "A Default Category";

        chrome.storage.local.get('savedBookmarks', function(data) {
            let bookmarks = data.savedBookmarks || {};

            // Clear existing bookmarks to prevent duplicates
            bookmarks = {};  // This resets the stored bookmarks to an empty object

            // Initialize the default category if not present
            if (!bookmarks[defaultCategory]) {
                bookmarks[defaultCategory] = [];
            }

            links.forEach(link => {
                const bookmarkData = {
                    url: link.href,
                    title: link.textContent || link.href
                };

                // Check if this URL is already in the list (prevents duplicates within the imported bookmarks)
                let urlExists = false;
                Object.keys(bookmarks).forEach(category => {
                    bookmarks[category].forEach(existingBookmark => {
                        if (existingBookmark.url === bookmarkData.url) {
                            urlExists = true;
                        }
                    });
                });

                // If the URL is not found, add the bookmark to the default category
                if (!urlExists) {
                    bookmarks[defaultCategory].push(bookmarkData);
                }
            });

            chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
                console.log("Bookmarks saved under category:", defaultCategory);
                displayBookmarks(); // Refresh the display after saving
            });
        });
    };

    reader.readAsText(file);
});

// Function to create a bookmark element with right-click menu
function createBookmarkElement(bookmark, category) {
    const bookmarkItem = document.createElement('a');
    bookmarkItem.href = bookmark.url;
    bookmarkItem.className = 'bookmark-item';
    bookmarkItem.textContent = bookmark.title;
    bookmarkItem.target = '_blank';

    // Make the bookmark draggable
    bookmarkItem.setAttribute('draggable', 'true');
    bookmarkItem.addEventListener('dragstart', function(event) {
        event.dataTransfer.setData('bookmark', JSON.stringify(bookmark)); // Save bookmark data
        event.dataTransfer.setData('oldCategory', category); // Save the old category
    });

    return bookmarkItem;
}

// Function to display stored bookmarks
// Function to display stored bookmarks with separators between categories
// Function to display stored bookmarks with separators between categories and functional drag-and-drop
// Function to display stored bookmarks with separators between categories and functional drag-and-drop
function displayBookmarks() {
    chrome.storage.local.get('savedBookmarks', function(data) {
        const bookmarkGrid = document.getElementById('bookmarkGrid');
        bookmarkGrid.innerHTML = ''; // Clear existing bookmarks

        if (!data.savedBookmarks) return;

        // Iterate over the categories
        Object.keys(data.savedBookmarks).forEach(category => {
            // Create a container for each category
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'category-container';

            // Add category title
            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category;
            categoryContainer.appendChild(categoryTitle);

            // Create a grid for bookmarks in this category
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'bookmark-grid';

            // Make the category grid droppable (to accept bookmarks dropped anywhere below the category name)
            categoryContainer.addEventListener('dragover', function(event) {
                event.preventDefault();  // Allow drop
            });

            categoryContainer.addEventListener('drop', function(event) {
                event.preventDefault();

                const draggedBookmark = JSON.parse(event.dataTransfer.getData('bookmark'));
                const oldCategory = event.dataTransfer.getData('oldCategory');
                const newCategory = category;  // Current category where the item is dropped

                if (oldCategory !== newCategory) {
                    moveBookmark(draggedBookmark, oldCategory, newCategory);
                }
            });

            // Add a separator (horizontal line) before the bookmarks
            const separator = document.createElement('hr');
            categoryGrid.appendChild(separator);

            // Add bookmark items to the category grid
            data.savedBookmarks[category].forEach(bookmark => {
                const bookmarkItem = createBookmarkElement(bookmark, category);
                categoryGrid.appendChild(bookmarkItem);
            });

            // Append the category grid to the container
            categoryContainer.appendChild(categoryGrid);

            // Add the category container to the main grid
            bookmarkGrid.appendChild(categoryContainer);
        });

        console.log("Bookmarks loaded!");
    });
}




// Function to add a new category
document.getElementById('addCategoryButton').addEventListener('click', function() {
    const categoryName = prompt("Enter the new category name:");

    if (!categoryName || categoryName.trim() === "") {
        return; // Do nothing if the category name is empty
    }

    chrome.storage.local.get('savedBookmarks', function(data) {
        let bookmarks = data.savedBookmarks || {};

        // Check if the category already exists
        if (bookmarks[categoryName]) {
            alert("Category already exists!");
            return;
        }

        // Add the new category
        bookmarks[categoryName] = [];

        chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
            console.log("New category added:", categoryName);
            displayBookmarks();
        });
    });
});

// Function to rename a category
function renameCategory(oldCategoryName) {
    const newCategoryName = prompt("Enter a new name for the category:", oldCategoryName);
    if (!newCategoryName || newCategoryName === oldCategoryName) return;

    chrome.storage.local.get('savedBookmarks', function(data) {
        let bookmarks = data.savedBookmarks || {};

        // Check if the new category name already exists
        if (bookmarks[newCategoryName]) {
            alert("A category with that name already exists.");
            return;
        }

        // Rename the category
        bookmarks[newCategoryName] = bookmarks[oldCategoryName];
        delete bookmarks[oldCategoryName];

        chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
            console.log("Category renamed to", newCategoryName);
            displayBookmarks();  // Refresh the displayed bookmarks
        });
    });
}

// Function to move a bookmark to a different category
function moveBookmark(bookmark, oldCategory, newCategory) {
    chrome.storage.local.get('savedBookmarks', function(data) {
        let bookmarks = data.savedBookmarks || {};

        // Ensure the new category exists as an array
        if (!Array.isArray(bookmarks[newCategory])) {
            bookmarks[newCategory] = [];  // Initialize as an empty array if not already
        }

        // Remove from the old category
        bookmarks[oldCategory] = bookmarks[oldCategory].filter(b => b.url !== bookmark.url);

        // If old category is empty, delete it
        if (bookmarks[oldCategory].length === 0) {
            delete bookmarks[oldCategory];
        }

        // Add to the new category
        bookmarks[newCategory].push(bookmark);

        // Update the stored bookmarks
        chrome.storage.local.set({ savedBookmarks: bookmarks }, () => {
            console.log("Bookmark moved from", oldCategory, "to", newCategory);
            displayBookmarks();  // Refresh the displayed bookmarks
        });
    });
}

// Ensure bookmarks are displayed when the page loads
document.addEventListener('DOMContentLoaded', function() {
    displayBookmarks(); // Display bookmarks when the page is loaded or refreshed
});
// Handle renaming of the page title
document.getElementById('pageTitle').addEventListener('blur', function() {
    const newTitle = document.getElementById('pageTitle').textContent.trim();
    if (newTitle && newTitle !== 'CUSTOM PAGE') {
        chrome.storage.local.set({ pageTitle: newTitle }, function() {
            console.log("Page title saved:", newTitle);
        });
    }
});

// Load the saved title when the page loads
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get('pageTitle', function(data) {
        if (data.pageTitle) {
            document.getElementById('pageTitle').textContent = data.pageTitle;
        }
    });
});
