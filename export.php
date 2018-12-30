<?php
if(isset($_POST['filename']) && isset($_POST['data'])) {
    header('Content-Disposition: attachment; filename='.$_POST['filename'].'.json');
    echo $_POST['data'];
}



?>