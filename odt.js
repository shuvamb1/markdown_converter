// Ensure that ODT is defined as a global object
// Define ODT as a global object
// Include JSZip (Make sure to add <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script> in your HTML)

var ODT = {
    parse: function (file, callback) {
        var reader = new FileReader();

        reader.onload = function (event) {
            JSZip.loadAsync(event.target.result)  // Load ZIP file
                .then(function (zip) {
                    return zip.file("content.xml").async("string");  // Extract content.xml
                })
                .then(function (xmlContent) {
                    var markdown = convertOdtToMarkdown(xmlContent); // Convert XML to Markdown
                    callback(null, markdown);
                })
                .catch(function (error) {
                    callback(error, null);
                });
        };

        reader.onerror = function (error) {
            callback(error, null);
        };

        reader.readAsArrayBuffer(file);  // Read file as binary
    }
};

// Convert ODT XML to Markdown (Basic Example)
// Convert ODT XML to Markdown
// Convert ODT XML to Markdown
function convertOdtToMarkdown(xmlContent) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    var markdownText = "";

    // Get the main text content
    var officeText = xmlDoc.getElementsByTagName("office:text")[0];
    if (!officeText) return "Error: No text content found in the ODT file.";

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.trim();
        }

        let result = "";

        switch (node.nodeName) {
            case "text:h": // Headings
                let level = node.getAttribute("text:outline-level") || 1;
                result += "#".repeat(level) + " " + node.textContent.trim() + "\n\n";
                break;

            case "text:p": // Paragraphs
                result += node.textContent.trim() + "\n\n";
                break;

            case "text:span": // Bold and Italics
                let style = node.getAttribute("text:style-name");
                let spanText = node.textContent.trim();
                if (style && style.toLowerCase().includes("bold")) {
                    result += `**${spanText}**`;
                } else if (style && style.toLowerCase().includes("italic")) {
                    result += `*${spanText}*`;
                } else {
                    result += spanText;
                }
                break;

            case "text:a": // Hyperlinks
                let url = node.getAttribute("xlink:href");
                result += `[${node.textContent.trim()}](${url})`;
                break;

            case "text:list": // Unordered lists
                let listItems = node.getElementsByTagName("text:list-item");
                for (let item of listItems) {
                    let itemText = processNode(item);
                    result += `- ${itemText}\n`;
                }
                result += "\n";
                break;

            case "table:table":
    let rows = node.getElementsByTagName("table:table-row");
    let tableData = [];

    // Extract table content
    for (let r = 0; r < rows.length; r++) {
        let rowCells = rows[r].getElementsByTagName("table:table-cell");
        let rowText = [];
        for (let c = 0; c < rowCells.length; c++) {
            let cellText = rowCells[c]?.textContent.trim() || " ";
            rowText.push(cellText);
        }
        tableData.push(rowText);
    }

    // Determine max column width for uniformity
    let colWidths = [];
    tableData.forEach(row => {
        row.forEach((cell, c) => {
            colWidths[c] = Math.max(colWidths[c] || 0, cell.length);
        });
    });

    // Function to format row with fixed column width
    const formatRow = (row) => {
        return "| " + row.map((cell, c) => cell.padEnd(colWidths[c], " ")).join(" | ") + " |";
    };

    // Construct final table output with a header separator
    let header = formatRow(tableData[0]);
    let separator = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |";
    let body = tableData.slice(1).map(formatRow).join("\n");

    let tableText = header + "\n" + separator + "\n" + body + "\n";
    result += tableText + "\n";
    break;

            case "draw:frame":
    let imageNode = node.getElementsByTagName("draw:image")[0];
    if (imageNode) {
        let href = imageNode.getAttribute("xlink:href");
        if (href) {
            let imagePath = `images/${href}`;  // Adjust path if necessary
            result += `\n![Image](${imagePath})\n\n`; 
        }
    }
    break;


            default: // Other elements
                for (let child of node.childNodes) {
                    result += processNode(child);
                }
        }

        return result;
    }

    // Process each child node in order
    for (let i = 0; i < officeText.childNodes.length; i++) {
        markdownText += processNode(officeText.childNodes[i]);
    }

    return markdownText.trim();
}
