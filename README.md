# ER 23

This repo accommodates our paper at ER 2023 on disability-aware conceptual modeling and proposes a tool prototype that allows basic user model interactions to be performed with the keyboard.

https://user-images.githubusercontent.com/61785275/204158028-f8f052a8-6ff5-409b-899c-64576c178c5a.mp4

For starting and running the application please read the [GLSP-README](./GLSP-README.md).

## Commands

### CRUD Modeling Operations

#### Tool Palette

The shortcut `ALT + P` sets the focus on the tool palette. Afterward, the characters `a - z` select an element or `1 - 5` for the header menu options.

#### Grid + Pointer

After selecting a node in the tool palette, the grid gets visible. The grid is for positioning the _pointer_ in the screen.

The following shortcuts are usable:

-   `1 - 9`: Position the pointer in the grid
-   `ARROW KEYS`: Move the pointer to a direction
-   `ENTER`: Create the node
-   `CTRL + ENTER`: Create multiple nodes

#### Create Nodes

1. `ALT + P`: Focus the tool palette
2. `a - z`: Select a node
3. `1 - 9`: Position the pointer in a cell
4. `ARROW KEYS`: Move the pointer to the correct position
5. Create the node by using either
    - `ENTER`: Create the node und finishes the operation
    - `CTRL + ENTER`: Create multiple nodes

#### Create Edges

1. `ALT + P`: Focus the tool palette
2. `a - z`: Select an edge
3. Type in either **type** or **name** of node for **source**
4. `ENTER`: Make selection
5. Type in either **type** or **name** of node for **target**
6. `ENTER`: Make selection

#### Search

The search palette can be opened by using the shortcut `CTRL + F`. It allows to search labelled elements or edges that have a labelled node as source or target. The result set will be highlighted accordingly.

#### Read / Select via Search

1. `CTRL + F`: Open the search palette
2. Type in either **type** or **name** of element
3. `ENTER`: Select the element

#### Update / Edit: Rename element

1. `CTRL + F`: Open the search palette
2. Type in either **type** or **name** of element
3. `ENTER`: Select the element
4. `F2`: Rename the labelled element

#### Delete

1. `CTRL + F`: Open the search palette
2. Type in either **type** or **name** of element
3. `ENTER`: Select the element
4. `DEL`: Delete the element

### Model Exploration

#### Move

1. Select one or multiple elements or the viewport.
2. Use arrow keys to move element(s) or viewport to the desired location.

#### Zoom

1. Select one or multiple elements or the viewport.
2. Use `+` or `-` to zoom in or out gradually.
3. `CTRL+0`: Set the zoom level to default.

#### Zoom via Grid

1. `CTRL+'+'`: Display the grid.
2. `1 - 9`: Position the pointer in a cell to zoom.
3. Repeat 2.) to reach the desired zoom level.

### Resize element

1. Select one or multiple elements.
2. `ALT+R`: Activate the resize mode.
3. `+` or `-` to adapt the size of the element(s).
4. `CTRL+0`: Set the size of the element(s) to default.

### Model Navigation

#### Default Navigation (following directions of relations)

1. Select element as starting point.
2. `N`: Activate default navigation.
3. Use arrow keys to iterate through model according to the directions of the given relations.

#### Position-based Navigation (following x and y coordinates)

1. Select element as starting point.
2. `ALT+N`: Activate position based navigation.
3. Use arrow keys to iterate through model according to the positions of the elements, i.e. depending on the order of the elements' x and y coordinates.

### Help

1. `ALT+H`: Display help about existing shortcuts and their descriptions.
