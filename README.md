# Caise 23

This repo accommodates our paper at CAiSE 2023 on disability-aware conceptual modeling and proposes a tool prototype that allows basic user model interactions to be performed with the keyboard.

For starting and running the application please read the [GLSP-README](./GLSP-README.md).

## Commands

### Tool Palette

The shortcut `ALT + P` sets the focus on the tool pallette. Afterward, the characters `a - z` select an element.

#### Grid + Pointer

After selecting a node in the tool palette, the grid gets visible. The grid is for positioning the _pointer_ in the screen.

The following shortcuts are usable:

-   `1 - 9`: Position the pointer in the grid
-   `ARROW KEYS`: Move the pointer to a direction
-   `ENTER`: Create the node
-   `CTRL + ENTER`: Create multiple nodes

### Search

The search palette can be opened by using the shortcut `CTRL + F`. It allows to search labelled elements or edges that have a labelled node as source or target.

## Workflows

### Create Nodes

1. `ALT + P`: Focus the tool palette
2. `a - z`: Select a node
3. `1 - 9`: Position the pointer in a cell
4. `ARROW KEYS`: Move the pointer to the correct position
5. Create the node by using either
    - `ENTER`: Create the node und finishes the operation
    - `CTRL + ENTER`: Create multiple nodes

### Create Edges

1. `ALT + P`: Focus the tool palette
2. `a - z`: Select an edge
3. Type in either **type** or **name** of node for **source**
4. `ENTER`: Make selection
5. Type in either **type** or **name** of node for **target**
6. `ENTER`: Make selection

### Read / Select

1. `CTRL + F`: Open the search palette
2. Type in either **type** or **name** of element
3. `ENTER`: Select the element

### Update / Edit: Rename element

1. `CTRL + F`: Open the search palette
2. Type in either **type** or **name** of element
3. `ENTER`: Select the element
4. `F2`: Rename the labelled element

### Delete

1. `CTRL + F`: Open the search palette
2. Type in either **type** or **name** of element
3. `ENTER`: Select the element
4. `DEL`: Delete the element
